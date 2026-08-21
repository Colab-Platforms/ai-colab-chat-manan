"""
Phase 1 conversational voice pipeline.

Flow: Daily WebRTC in -> Silero VAD -> Deepgram STT -> LLM (OpenRouter, same
model family the text chat uses) -> emotion-tag parsing -> ElevenLabs TTS ->
Daily WebRTC out.

Each call is tied to a Node-owned Chat row (chat_id, passed in from
server.py). On start, the bot fetches that chat's prior messages plus the
user's personalisation memory from Node and seeds the LLM context with them;
as the call proceeds, each completed turn is posted back to Node so the call
shows up as ordinary chat history. voice-agent never touches Postgres
directly — see node_client.py.

Run one instance of `run_bot()` per active voice session (spawned by
`server.py` when the frontend requests a session).
"""

import json
import sys

from loguru import logger
from pipecat.adapters.schemas.function_schema import FunctionSchema
from pipecat.adapters.schemas.tools_schema import ToolsSchema
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.frames.frames import Frame, LLMFullResponseStartFrame, TextFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import (
    OpenAILLMContext,
    OpenAILLMContextFrame,
)
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.processors.frameworks.rtvi import (
    RTVIConfig,
    RTVIObserver,
    RTVIProcessor,
    RTVIServerMessageFrame,
)
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.services.elevenlabs.tts import ElevenLabsTTSService
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.transports.services.daily import DailyParams, DailyTransport

from . import node_client
from .config import settings
from .emotion import extract_emotion

logger.remove()
logger.add(sys.stderr, level="INFO")

VOICE_SYSTEM_PROMPT = """You are Colab AI, the user's personal AI companion, speaking with them out loud.

Identity:
- Your name is ColabAI. If asked who you are, say you're ColabAI — never call yourself "a personal AI assistant/companion" as your identity, and never mention being built on an underlying language model unless directly asked.

Rules for every reply:
- Speak the way a real person talks: short sentences, contractions, no markdown, no lists, no headings.
- Prefix every reply with exactly one tag on its own line: [Emotion: <Happy|Excited|Sad|Thinking|Laughing|Surprised|Neutral>, Intensity: <0-100>%]
  Pick the emotion and intensity that best fits your reply — most replies should be Neutral at low-to-moderate intensity.
- The emotion tag is an internal system instruction for controlling voice delivery. It is NEVER read aloud or explained. Never say the words "emotion", "intensity", or describe your own emotional state out loud — the tag communicates that silently.
- Keep replies brief (1-3 sentences) unless the user explicitly asks for detail.

Documents:
- You can generate a document (PDF, Word, PowerPoint, or Excel) using the generate_document tool. Use it whenever the user asks you to create, make, write, generate, or prepare a document, report, presentation, spreadsheet, or file — including "make me a PDF about X" or "write that up as a document."
- Call the tool, then immediately continue speaking naturally — tell the user it's being prepared and will be ready in their chat history shortly, and keep talking (e.g. offer to say more about the topic). Never say you'll "wait" or go silent — generation happens in the background while the conversation continues.
- Default to PDF format unless the user names a specific one.
"""

DOCUMENT_TOOL_SCHEMA = FunctionSchema(
    name="generate_document",
    description=(
        "Generate a document (PDF, Word, PowerPoint, or Excel) about a topic, or "
        "summarising the conversation so far. Use whenever the user asks to create, "
        "make, write, generate, or prepare a document, report, presentation, or file."
    ),
    properties={
        "topic": {
            "type": "string",
            "description": "What the document should be about, written as a clear generation prompt.",
        },
        "format": {
            "type": "string",
            "enum": ["PDF", "DOCX", "PPTX", "XLSX"],
            "description": "Document format. Default to PDF if the user doesn't specify one.",
        },
    },
    required=["topic"],
)


class EmotionAwareTTSProcessor(FrameProcessor):
    """Buffers streamed LLM text until the leading emotion tag is fully
    received (it arrives token-by-token, not as one frame, so a tag can span
    many small TextFrames), strips it, and re-tunes the TTS service's voice
    settings per-utterance before the clean text reaches it."""

    def __init__(self, tts: ElevenLabsTTSService):
        super().__init__()
        self._tts = tts
        self._buffer = ""
        self._tag_resolved = False

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if isinstance(frame, LLMFullResponseStartFrame):
            self._buffer = ""
            self._tag_resolved = False
            await self.push_frame(frame, direction)
            return

        if isinstance(frame, TextFrame) and frame.text and not self._tag_resolved:
            self._buffer += frame.text

            # Tag not fully arrived yet — hold everything, emit nothing.
            if "]" not in self._buffer:
                if len(self._buffer) > 200:
                    # Safety valve: no closing "]" within a reasonable
                    # length means the model didn't emit a tag at all this
                    # turn. Stop buffering so speech isn't dropped entirely.
                    self._tag_resolved = True
                    await self.push_frame(TextFrame(text=self._buffer), direction)
                    self._buffer = ""
                return

            clean_text, cue = extract_emotion(self._buffer)
            self._tag_resolved = True
            self._buffer = ""

            # pipecat-ai 0.0.62's ElevenLabsTTSService has no public per-utterance
            # settings setter (update_setting() is an inherited no-op for this
            # service) — it only rebuilds voice_settings from self._settings at
            # __init__ time. Mutating _settings and recomputing the cached
            # payload is the only way to change delivery per-turn on this
            # version; re-check pipecat's ElevenLabsTTSService source if
            # upgrading, this may become unnecessary.
            self._tts._settings["stability"] = cue.stability
            self._tts._settings["style"] = cue.style
            self._tts._voice_settings = self._tts._set_voice_settings()

            if clean_text:
                # Whatever text arrived bundled with the tag in this same
                # network chunk (the upstream provider doesn't always
                # deliver one token per chunk) would otherwise reach TTS as
                # one large TextFrame — ElevenLabs' websocket flushes audio
                # based on the text it's been given, so a big first chunk
                # means a long silence, then a long burst, instead of
                # natural streaming speech. Splitting on whitespace here
                # re-creates token-sized pieces so TTS starts generating
                # audio for the first word(s) immediately, matching the
                # smooth per-token flow every later frame already gets via
                # plain pass-through below.
                for piece in clean_text.split(" "):
                    if piece:
                        await self.push_frame(TextFrame(text=piece + " "), direction)
            return

        await self.push_frame(frame, direction)


class MessageSyncProcessor(FrameProcessor):
    """Persists each completed turn back to the Node backend as a normal
    Message row, so a voice call shows up as chat history like any other
    conversation. Placed right after a context aggregator: aggregators push
    an OpenAILLMContextFrame with the turn already appended to
    context.messages once it's complete, so the last entry is exactly the
    turn that just finished — no separate buffering needed here."""

    def __init__(self, chat_id: int, role: str):
        super().__init__()
        self._chat_id = chat_id
        self._role = role

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if isinstance(frame, OpenAILLMContextFrame) and frame.context.messages:
            last = frame.context.messages[-1]
            if last.get("role") == ("user" if self._role == "USER" else "assistant"):
                content = last.get("content")
                if isinstance(content, str) and content.strip():
                    await node_client.post_message(self._chat_id, self._role, content)

        await self.push_frame(frame, direction)


async def run_bot(room_url: str, token: str, voice_id: str | None, chat_id: int):
    transport = DailyTransport(
        room_url,
        token,
        "Personal AI Agent",
        DailyParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            # 0.4s (tried for lower latency) was shorter than a normal
            # thinking-pause mid-sentence, so every such pause got treated
            # as a full turn-end — one utterance was getting fragmented into
            # several separate messages/replies. 0.7s is close to Pipecat's
            # 0.8s default; still a little snappier, without cutting off
            # natural pauses.
            vad_analyzer=SileroVADAnalyzer(params=VADParams(stop_secs=0.7)),
            transcription_enabled=False,  # Deepgram service below owns STT
        ),
    )

    stt = DeepgramSTTService(api_key=settings.deepgram_api_key)

    llm = OpenAILLMService(
        api_key=settings.openrouter_api_key,
        base_url=settings.openrouter_base_url,
        model=settings.voice_llm_model,
    )

    tts = ElevenLabsTTSService(
        api_key=settings.elevenlabs_api_key,
        voice_id=voice_id or settings.elevenlabs_default_voice_id,
        model="eleven_turbo_v2_5",
    )

    emotion_processor = EmotionAwareTTSProcessor(tts)

    # Handles the RTVI client<->bot handshake (@pipecat-ai/client-js sends
    # "client-ready" over the Daily data channel once connected; without this
    # processor nothing ever replies "bot-ready" and the frontend's
    # client.connect() hangs on "Connecting..." forever).
    rtvi = RTVIProcessor(config=RTVIConfig(config=[]))

    # Seed with this chat's prior turns + the same personalisation memory
    # text-chat uses, so a voice call picks up context instead of starting
    # cold every time. Best-effort — node_client falls back to empty on
    # any failure so a Node hiccup never blocks the call from starting.
    voice_context = await node_client.fetch_context(chat_id)
    system_prompt = VOICE_SYSTEM_PROMPT
    if voice_context["contextText"]:
        system_prompt = f"{VOICE_SYSTEM_PROMPT}\n\n{voice_context['contextText']}"

    initial_messages = [{"role": "system", "content": system_prompt}, *voice_context["history"]]
    context = OpenAILLMContext(
        initial_messages,
        tools=ToolsSchema(standard_tools=[DOCUMENT_TOOL_SCHEMA]),
    )
    context_aggregator = llm.create_context_aggregator(context)

    # Only a brand-new chat gets a proactive greeting — resuming an existing
    # one (voice_context["history"] non-empty) waits for the user as normal,
    # so ColabAI doesn't re-greet every time someone reopens a conversation.
    is_new_chat = not voice_context["history"]

    async def handle_generate_document(
        function_name, tool_call_id, arguments, llm_service, llm_context, result_callback
    ):
        args = json.loads(arguments) if isinstance(arguments, str) else arguments
        topic = (args or {}).get("topic", "").strip()
        doc_format = (args or {}).get("format")

        if not topic:
            await result_callback({"status": "error", "message": "No topic given."})
            return

        result = await node_client.trigger_document_generation(chat_id, topic, doc_format)
        if result.get("ok"):
            await result_callback(
                {"status": "started", "message": "Document generation has started in the background."}
            )
            if result.get("document"):
                # One push is enough — DocumentCard on the frontend self-polls
                # PENDING/PROCESSING until COMPLETED/FAILED, same as it does
                # in the text-chat flow. We just need to hand it the initial
                # row so a card appears in the call at all.
                await llm_service.push_frame(
                    RTVIServerMessageFrame(
                        data={"type": "document_generated", "document": result["document"]}
                    ),
                    FrameDirection.UPSTREAM,
                )
        else:
            await result_callback(
                {"status": "error", "message": "Could not start document generation right now."}
            )

    llm.register_function("generate_document", handle_generate_document)

    user_sync = MessageSyncProcessor(chat_id, "USER")
    assistant_sync = MessageSyncProcessor(chat_id, "ASSISTANT")

    pipeline = Pipeline(
        [
            transport.input(),
            rtvi,
            stt,
            context_aggregator.user(),
            user_sync,
            llm,
            emotion_processor,
            tts,
            transport.output(),
            context_aggregator.assistant(),
            assistant_sync,
        ]
    )

    task = PipelineTask(
        pipeline,
        params=PipelineParams(allow_interruptions=True),
        observers=[RTVIObserver(rtvi)],
    )

    @rtvi.event_handler("on_client_ready")
    async def on_client_ready(rtvi):
        # set_client_ready() only flips a flag and fires this event — it does
        # NOT send "bot-ready" itself. Without this handler calling
        # set_bot_ready() explicitly, the frontend's client.connect() waits
        # on "Connecting..." forever even though everything else works.
        await rtvi.set_bot_ready()

        if is_new_chat:
            name_clause = f", whose name is {voice_context['userFirstName']}" if voice_context["userFirstName"] else ""
            greeting_instruction = (
                f"This is the start of a new conversation. It is currently the "
                f"{voice_context['timeOfDay']} for the user{name_clause}. Proactively greet them "
                "first — use their name if given, reference the time of day naturally (e.g. "
                "'good morning'), and if the voice-memory summary in your context mentions "
                "recent work, briefly ask how it went or what they'd like to build today. "
                "Keep it to 1-2 sentences. Still follow the Emotion tag rule."
            )
            context.messages.append({"role": "system", "content": greeting_instruction})
            # Triggers the LLM directly (BaseOpenAILLMService reacts to
            # OpenAILLMContextFrame by generating a completion from
            # context.messages) instead of waiting for user speech —
            # queued at the pipeline source so it flows through the same
            # path a real turn would.
            await task.queue_frames([OpenAILLMContextFrame(context)])

    @transport.event_handler("on_first_participant_joined")
    async def on_first_participant_joined(transport, participant):
        await transport.capture_participant_transcription(participant["id"])

    @transport.event_handler("on_participant_left")
    async def on_participant_left(transport, participant, reason):
        logger.info(f"Participant left ({reason}), ending session")
        await task.cancel()

    runner = PipelineRunner()
    await runner.run(task)
