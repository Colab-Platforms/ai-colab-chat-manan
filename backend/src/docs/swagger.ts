import swaggerJSDoc from "swagger-jsdoc";
import j2s from "joi-to-swagger";

import {
  registerSchema,
  loginSchema,
  verifyEmailOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/modules/auth/auth.validators.js";
import { updateProfileSchema } from "@/modules/user/user.validators.js";
import {
  createFolderSchema,
  updateFolderSchema,
} from "@/modules/folder/folder.validators.js";
import {
  createChatSchema,
  updateChatSchema,
  feedbackSchema,
  updateChatContextsSchema,
} from "@/modules/chat/chat.validators.js";
import {
  createMessageSchema,
  starResponseSchema,
  enhancePromptSchema,
} from "@/modules/message/message.validators.js";
import {
  createContextSchema,
  updateContextSchema,
} from "@/modules/context/context.validators.js";
import {
  createAssistantSchema,
  updateAssistantSchema,
} from "@/modules/assistant/assistant.validators.js";
import {
  createModelSchema,
  updateModelSchema,
} from "@/modules/model/model.validators.js";
import {
  createModelProviderSchema,
  updateModelProviderSchema,
} from "@/modules/model-provider/modelProvider.validators.js";
import {
  createPlanSchema,
  updatePlanSchema,
} from "@/modules/plan/plan.validators.js";
import { createSubscriptionSchema } from "@/modules/subscription/subscription.validators.js";
import { completeResponseSchema } from "@/modules/model-response/modelResponse.validators.js";
import { createSubscribeOneTimeSchema } from "@/modules/payments/payment.validators.js";

const toSwagger = (schema: any) => j2s(schema).swagger;

const roleTags = {
  public: ["Public"],
  user: ["User"],
  admin: ["Admin"],
  shared: ["User", "Admin"],
} as const;

// Module tag helpers
const moduleTags = {
  auth: "Authentication",
  user: "User Management",
  folder: "Folders",
  chat: "Chats",
  message: "Messages",
  modelResponse: "Model Responses",
  attachment: "Attachments",
  wallet: "Wallet",
  subscription: "Subscriptions",
  plan: "Plans",
  usageLog: "Usage Logs",
  model: "Models",
  modelProvider: "Model Providers",
  preferences: "User Preferences",
  assistant: "Assistants",
  context: "Contexts",
  dashboard: "Dashboard",
  payment: "Payments",
} as const;

// Group operations by role first, then module in the same tag.
// Example: "User / Chats", "Admin / Chats".
const createTags = (roles: readonly string[], module: string): string[] =>
  roles.map((role) => (role === "Public" ? role : `${role} / ${module}`));

const genericObjectSchema = {
  type: "object",
  additionalProperties: true,
};

const paginationDataSchema = {
  type: "object",
  properties: {
    currentPage: { type: "integer", example: 1 },
    pageSize: { type: "integer", example: 20 },
    totalRecords: { type: "integer", example: 128 },
    totalPages: { type: "integer", example: 7 },
    hasNextPage: { type: "boolean", example: true },
    hasPreviousPage: { type: "boolean", example: false },
    data: {
      type: "array",
      items: genericObjectSchema,
    },
  },
  required: [
    "currentPage",
    "pageSize",
    "totalRecords",
    "totalPages",
    "hasNextPage",
    "hasPreviousPage",
    "data",
  ],
};

const responseEnvelope = (dataSchema: any) => ({
  type: "object",
  properties: {
    status: { type: "boolean", example: true },
    message: { type: "string", example: "Success" },
    data: dataSchema,
  },
  required: ["status", "message", "data"],
});

const errorEnvelope = {
  type: "object",
  properties: {
    status: { type: "boolean", example: false },
    message: { type: "string", example: "Bad request" },
    data: {
      oneOf: [{ type: "object", additionalProperties: true }, { type: "null" }],
    },
  },
  required: ["status", "message", "data"],
};

const successResponse = (
  dataSchema: any,
  description = "Successful response",
) => ({
  description,
  content: {
    "application/json": {
      schema: responseEnvelope(dataSchema),
    },
  },
});

const paginatedSuccessResponse = (description = "Successful response") =>
  successResponse(paginationDataSchema, description);

const nullSchema = { type: "null" };

const redirectResponse = (description = "Redirect response") => ({
  description,
});

const pathParam = (name: string, description: string) => ({
  name,
  in: "path",
  required: true,
  schema: { type: "string" },
  description,
});

const queryParam = (
  name: string,
  schema: any,
  description: string,
  example?: any,
) => ({
  name,
  in: "query",
  required: false,
  schema: example === undefined ? schema : { ...schema, example },
  description,
});

const paginationParams = [
  queryParam(
    "page",
    { type: "integer", minimum: 1 },
    "Page number, starting from 1.",
    1,
  ),
  queryParam(
    "pageSize",
    { type: "integer", minimum: 1, maximum: 100 },
    "Page size, capped at 100.",
    20,
  ),
  queryParam(
    "search",
    { type: "string" },
    "Free-text search across the endpoint's documented search fields.",
    "example",
  ),
  queryParam(
    "sort",
    { type: "string" },
    "Comma-separated sort instructions in the form field:asc or field:desc. Example: createdAt:desc,name:asc.",
    "createdAt:desc",
  ),
];

const exactFilterParams = (
  filters: Array<{
    name: string;
    schema: any;
    description: string;
    example?: any;
  }>,
) =>
  filters.map((filter) =>
    queryParam(filter.name, filter.schema, filter.description, filter.example),
  );

const rangeFilterParams = (
  filters: Array<{
    name: string;
    schema: any;
    description: string;
    example?: any;
  }>,
) =>
  filters.flatMap((filter) => [
    queryParam(
      `${filter.name}_min`,
      filter.schema,
      `${filter.description} Lower bound.`,
      filter.example,
    ),
    queryParam(
      `${filter.name}_max`,
      filter.schema,
      `${filter.description} Upper bound.`,
      filter.example,
    ),
  ]);

const bearerSecurity = [{ bearerAuth: [] }];

const jsonBody = (schema: any, required = true) => ({
  required,
  content: {
    "application/json": {
      schema,
    },
  },
});

const multipartBody = (
  properties: Record<string, any>,
  required: string[] = [],
) => ({
  required: true,
  content: {
    "multipart/form-data": {
      schema: {
        type: "object",
        properties,
        required,
      },
    },
  },
});

const openapiDefinition = {
  openapi: "3.1.0",
  info: {
    title: "AI Colab Chat Backend API",
    version: "1.0.0",
    description:
      "Production OpenAPI documentation for the AI Colab Chat backend. The API uses role-based JWT access with USER, ADMIN, and SUPERADMIN roles.",
  },
  servers: [
    {
      url: process.env.API_BASE_URL?.trim() || "/api",
      description: "Backend API base path",
    },
  ],
  tags: [
    {
      name: "Public",
      description:
        "Unauthenticated endpoints, webhooks, and shared public resources.",
    },
    {
      name: "User",
      description:
        "Authenticated user-facing endpoints used by both the mobile app and regular user flows.",
    },
    {
      name: "Admin",
      description:
        "Administrator-only endpoints for content and system management.",
    },
    // Module Tags
    {
      name: moduleTags.auth,
      description: "User authentication and authorization endpoints.",
    },
    {
      name: moduleTags.user,
      description: "User account and profile management endpoints.",
    },
    {
      name: moduleTags.folder,
      description: "Folder management and organization endpoints.",
    },
    {
      name: moduleTags.chat,
      description: "Chat creation, retrieval, and manipulation endpoints.",
    },
    {
      name: moduleTags.message,
      description: "Message and response management endpoints.",
    },
    {
      name: moduleTags.modelResponse,
      description: "Model response persistence and feedback endpoints.",
    },
    {
      name: moduleTags.attachment,
      description: "File attachment upload and download endpoints.",
    },
    {
      name: moduleTags.wallet,
      description: "Wallet balance and transaction management endpoints.",
    },
    {
      name: moduleTags.subscription,
      description: "Subscription lifecycle and autopay management endpoints.",
    },
    {
      name: moduleTags.plan,
      description: "Subscription plan retrieval and administration endpoints.",
    },
    {
      name: moduleTags.usageLog,
      description: "API usage tracking and analytics endpoints.",
    },
    {
      name: moduleTags.model,
      description: "AI model configuration and management endpoints.",
    },
    {
      name: moduleTags.modelProvider,
      description: "AI provider configuration and management endpoints.",
    },
    {
      name: moduleTags.preferences,
      description: "User preference and settings management endpoints.",
    },
    {
      name: moduleTags.assistant,
      description: "Assistant template and configuration endpoints.",
    },
    {
      name: moduleTags.context,
      description: "Context and memory management endpoints.",
    },
    {
      name: moduleTags.dashboard,
      description: "Dashboard analytics and summary endpoints.",
    },
    {
      name: moduleTags.payment,
      description: "Payment processing and webhook endpoints.",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "Bearer token with the JWT claims used by the backend. The app should inspect the role claim to switch between USER, ADMIN, and SUPERADMIN flows.",
      },
    },
    schemas: {
      ErrorResponse: errorEnvelope,
      SuccessResponse: responseEnvelope(genericObjectSchema),
      PaginationResponse: responseEnvelope(paginationDataSchema),
      AuthSession: {
        type: "object",
        properties: {
          user: genericObjectSchema,
          token: { type: "string" },
          requiresEmailVerification: { type: "boolean" },
        },
        required: ["user", "token", "requiresEmailVerification"],
      },
      GenericEntity: genericObjectSchema,
      GenericArray: { type: "array", items: genericObjectSchema },
      StreamEnvelope: {
        type: "string",
        description:
          "Server-sent event stream returned by chat generation endpoints.",
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Public"],
        summary: "Health check",
        description:
          "Verify that the backend server is running and operational.",
        responses: {
          200: {
            description: "Server is running",
            content: {
              "text/plain": {
                schema: { type: "string" },
              },
            },
          },
        },
      },
    },
    "/auth/register": {
      post: {
        tags: createTags(roleTags.public, moduleTags.auth),
        summary: "Register user",
        description: "Create a new user account with email and password.",
        requestBody: jsonBody(toSwagger(registerSchema)),
        responses: {
          201: successResponse(
            { $ref: "#/components/schemas/AuthSession" },
            "User registered successfully",
          ),
          400: successResponse(
            { $ref: "#/components/schemas/ErrorResponse" },
            "Validation failed",
          ),
        },
      },
    },
    "/auth/login": {
      post: {
        tags: createTags(roleTags.public, moduleTags.auth),
        summary: "Login user",
        description:
          "Authenticate user with email and password to receive a JWT token.",
        requestBody: jsonBody(toSwagger(loginSchema)),
        responses: {
          200: successResponse(
            { $ref: "#/components/schemas/AuthSession" },
            "Login successful",
          ),
          400: successResponse(
            { $ref: "#/components/schemas/ErrorResponse" },
            "Validation failed",
          ),
        },
      },
    },
    "/auth/google/start": {
      get: {
        tags: createTags(roleTags.public, moduleTags.auth),
        summary: "Start Google OAuth",
        description:
          "Initiate Google OAuth flow with optional redirect preservation.",
        parameters: [
          queryParam(
            "redirect",
            { type: "string" },
            "Optional front-end redirect path that will be preserved through the OAuth flow.",
          ),
        ],
        responses: {
          302: redirectResponse("Redirects the browser to Google OAuth"),
        },
      },
    },
    "/auth/google/callback": {
      get: {
        tags: createTags(roleTags.public, moduleTags.auth),
        summary: "Handle Google OAuth callback",
        description:
          "Process Google OAuth callback and complete authentication.",
        parameters: [
          queryParam(
            "code",
            { type: "string" },
            "OAuth authorization code returned by Google.",
          ),
          queryParam(
            "state",
            { type: "string" },
            "OAuth state value returned by Google.",
          ),
          queryParam(
            "error",
            { type: "string" },
            "OAuth error returned by Google, if present.",
          ),
        ],
        responses: {
          302: redirectResponse("Redirects the browser back to the app"),
        },
      },
    },
    "/auth/verify-email-otp": {
      post: {
        tags: createTags(roleTags.public, moduleTags.auth),
        summary: "Verify email OTP",
        description:
          "Verify user email address using a one-time password sent via email.",
        requestBody: jsonBody(toSwagger(verifyEmailOtpSchema)),
        responses: {
          200: successResponse(
            genericObjectSchema,
            "OTP verified successfully",
          ),
        },
      },
    },
    "/auth/resend-email-otp": {
      post: {
        tags: createTags(roleTags.public, moduleTags.auth),
        summary: "Resend email verification OTP",
        description:
          "Send a new OTP code to the user's email for verification.",
        requestBody: jsonBody(toSwagger(forgotPasswordSchema)),
        responses: {
          200: successResponse(genericObjectSchema, "Verification OTP sent"),
        },
      },
    },
    "/auth/forgot-password": {
      post: {
        tags: createTags(roleTags.public, moduleTags.auth),
        summary: "Request password reset OTP",
        description: "Send a password reset OTP to the user's email address.",
        requestBody: jsonBody(toSwagger(forgotPasswordSchema)),
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Reset OTP sent if the email exists",
          ),
        },
      },
    },
    "/auth/reset-password": {
      post: {
        tags: createTags(roleTags.public, moduleTags.auth),
        summary: "Reset password using OTP",
        description: "Set a new password using the OTP received via email.",
        requestBody: jsonBody(toSwagger(resetPasswordSchema)),
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Password reset successfully",
          ),
        },
      },
    },
    "/users": {
      get: {
        tags: createTags(roleTags.admin, moduleTags.user),
        summary: "List users",
        description:
          "Retrieve a paginated list of all users. Searches first name, last name, and email. Supports `isActive`, `isVerified`, `sort`, `page`, and `pageSize`.",
        security: bearerSecurity,
        parameters: [
          ...paginationParams,
          ...exactFilterParams([
            {
              name: "isActive",
              schema: { type: "boolean" },
              description: "Filter by active status.",
              example: true,
            },
            {
              name: "isVerified",
              schema: { type: "boolean" },
              description: "Filter by email verification status.",
              example: false,
            },
          ]),
        ],
        responses: {
          200: paginatedSuccessResponse("Users fetched successfully"),
        },
      },
    },
    "/users/profile": {
      get: {
        tags: createTags(roleTags.shared, moduleTags.user),
        summary: "Get current profile",
        description: "Retrieve the authenticated user's profile information.",
        security: bearerSecurity,
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Profile fetched successfully",
          ),
        },
      },
      put: {
        tags: createTags(roleTags.shared, moduleTags.user),
        summary: "Update current profile",
        description: "Update the authenticated user's profile details.",
        security: bearerSecurity,
        requestBody: jsonBody(toSwagger(updateProfileSchema)),
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Profile updated successfully",
          ),
        },
      },
    },
    "/users/{id}": {
      delete: {
        tags: createTags(roleTags.shared, moduleTags.user),
        summary: "Delete a user account",
        description:
          "Permanently delete a user account and all associated data.",
        security: bearerSecurity,
        parameters: [pathParam("id", "User identifier.")],
        responses: {
          200: successResponse(
            genericObjectSchema,
            "User deleted successfully",
          ),
        },
      },
      put: {
        tags: createTags(roleTags.admin, moduleTags.user),
        summary: "Admin update user",
        description: "Admin endpoint to update any user's account information.",
        security: bearerSecurity,
        parameters: [pathParam("id", "User identifier.")],
        requestBody: jsonBody({ type: "object", additionalProperties: true }),
        responses: {
          200: successResponse(
            genericObjectSchema,
            "User updated successfully",
          ),
        },
      },
    },
    "/users/{id}/usage": {
      get: {
        tags: createTags(roleTags.admin, moduleTags.user),
        summary: "Get user usage logs",
        description: "Retrieve API usage statistics for a specific user.",
        security: bearerSecurity,
        parameters: [
          pathParam("id", "User identifier."),
          ...paginationParams,
          queryParam(
            "search",
            { type: "string" },
            "Searches usage logs by user name or email.",
          ),
          queryParam(
            "sort",
            { type: "string" },
            "Sort by createdAt, firstName, or email. Example: createdAt:desc.",
          ),
        ],
        responses: {
          200: successResponse(
            genericObjectSchema,
            "User usage fetched successfully",
          ),
        },
      },
    },
    "/users/{id}/subscription": {
      get: {
        tags: createTags(roleTags.admin, moduleTags.user),
        summary: "Get user subscription",
        description: "Retrieve subscription details for a specific user.",
        security: bearerSecurity,
        parameters: [pathParam("id", "User identifier.")],
        responses: {
          200: successResponse(
            genericObjectSchema,
            "User subscription fetched successfully",
          ),
        },
      },
    },
    "/folders": {
      get: {
        tags: createTags(roleTags.shared, moduleTags.folder),
        summary: "List folders",
        description:
          "Retrieve all folders for the authenticated user with pagination support. Searches folder names. Supports `search`, `sort`, `page`, and `pageSize`.",
        security: bearerSecurity,
        parameters: [...paginationParams],
        responses: {
          200: paginatedSuccessResponse("Folders fetched successfully"),
        },
      },
      post: {
        tags: createTags(roleTags.shared, moduleTags.folder),
        summary: "Create folder",
        description: "Create a new folder to organize chats.",
        security: bearerSecurity,
        requestBody: jsonBody(toSwagger(createFolderSchema)),
        responses: {
          201: successResponse(
            genericObjectSchema,
            "Folder created successfully",
          ),
        },
      },
    },
    "/folders/{id}": {
      put: {
        tags: createTags(roleTags.shared, moduleTags.folder),
        summary: "Update folder",
        description: "Rename or update an existing folder.",
        security: bearerSecurity,
        parameters: [pathParam("id", "Folder identifier.")],
        requestBody: jsonBody(toSwagger(updateFolderSchema)),
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Folder updated successfully",
          ),
        },
      },
      delete: {
        tags: createTags(roleTags.shared, moduleTags.folder),
        summary: "Delete folder",
        description:
          "Delete a folder and optionally delete or move out its chats.",
        security: bearerSecurity,
        parameters: [
          pathParam("id", "Folder identifier."),
          queryParam(
            "deleteChats",
            { type: "boolean" },
            "If true, delete chats in the folder; otherwise move them out.",
            false,
          ),
        ],
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Folder deleted successfully",
          ),
        },
      },
    },
    "/chats": {
      get: {
        tags: createTags(roleTags.shared, moduleTags.chat),
        summary: "List chats",
        description:
          "Retrieve a paginated list of user's chats. Searches chat titles. Supports `folderId`, `isArchived`, `sort`, `page`, and `pageSize`. Use `folderId=null` to fetch unfiled chats.",
        security: bearerSecurity,
        parameters: [
          ...paginationParams,
          ...exactFilterParams([
            {
              name: "folderId",
              schema: {
                oneOf: [
                  { type: "integer" },
                  { type: "string", enum: ["null"] },
                ],
              },
              description: "Exact folder filter or `null` for unfiled chats.",
              example: "null",
            },
            {
              name: "isArchived",
              schema: { type: "boolean" },
              description: "Filter by archived state.",
              example: false,
            },
          ]),
        ],
        responses: {
          200: paginatedSuccessResponse("Chats fetched successfully"),
        },
      },
      post: {
        tags: createTags(roleTags.shared, moduleTags.chat),
        summary: "Create chat",
        description: "Start a new chat conversation.",
        security: bearerSecurity,
        requestBody: jsonBody(toSwagger(createChatSchema)),
        responses: {
          201: successResponse(
            genericObjectSchema,
            "Chat created successfully",
          ),
        },
      },
    },
    "/chats/shared/{shareId}": {
      get: {
        tags: createTags(roleTags.public, moduleTags.chat),
        summary: "Get shared chat",
        description: "Access a publicly shared chat using its share ID.",
        parameters: [pathParam("shareId", "Public share identifier.")],
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Shared chat fetched successfully",
          ),
        },
      },
    },
    "/chats/{id}": {
      get: {
        tags: createTags(roleTags.shared, moduleTags.chat),
        summary: "Get chat by id",
        description: "Retrieve details of a specific chat conversation.",
        security: bearerSecurity,
        parameters: [pathParam("id", "Chat identifier.")],
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Chat fetched successfully",
          ),
        },
      },
      put: {
        tags: createTags(roleTags.shared, moduleTags.chat),
        summary: "Update chat",
        description: "Update chat title, folder, or other properties.",
        security: bearerSecurity,
        parameters: [pathParam("id", "Chat identifier.")],
        requestBody: jsonBody(toSwagger(updateChatSchema)),
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Chat updated successfully",
          ),
        },
      },
      delete: {
        tags: createTags(roleTags.shared, moduleTags.chat),
        summary: "Delete chat",
        description: "Permanently delete a chat and all its messages.",
        security: bearerSecurity,
        parameters: [pathParam("id", "Chat identifier.")],
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Chat deleted successfully",
          ),
        },
      },
    },
    "/chats/{id}/contexts": {
      get: {
        tags: createTags(roleTags.shared, moduleTags.chat),
        summary: "Get chat contexts",
        description: "Retrieve all contexts associated with a specific chat.",
        security: bearerSecurity,
        parameters: [pathParam("id", "Chat identifier.")],
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Chat contexts fetched successfully",
          ),
        },
      },
      put: {
        tags: createTags(roleTags.shared, moduleTags.chat),
        summary: "Replace chat contexts",
        description: "Update the list of contexts for a chat conversation.",
        security: bearerSecurity,
        parameters: [pathParam("id", "Chat identifier.")],
        requestBody: jsonBody(toSwagger(updateChatContextsSchema)),
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Chat contexts updated successfully",
          ),
        },
      },
    },
    "/chats/{id}/archive": {
      patch: {
        tags: createTags(roleTags.shared, moduleTags.chat),
        summary: "Toggle chat archive state",
        description: "Archive or unarchive a chat conversation.",
        security: bearerSecurity,
        parameters: [pathParam("id", "Chat identifier.")],
        responses: {
          200: successResponse(genericObjectSchema, "Chat archive toggled"),
        },
      },
    },
    "/chats/{id}/pin": {
      patch: {
        tags: createTags(roleTags.shared, moduleTags.chat),
        summary: "Toggle chat pin state",
        description: "Pin or unpin a chat to keep it at the top of the list.",
        security: bearerSecurity,
        parameters: [pathParam("id", "Chat identifier.")],
        responses: {
          200: successResponse(genericObjectSchema, "Chat pin toggled"),
        },
      },
    },
    "/chats/{id}/share": {
      patch: {
        tags: createTags(roleTags.shared, moduleTags.chat),
        summary: "Toggle chat sharing",
        description: "Enable or disable public sharing of a chat conversation.",
        security: bearerSecurity,
        parameters: [pathParam("id", "Chat identifier.")],
        responses: {
          200: successResponse(genericObjectSchema, "Chat shared successfully"),
        },
      },
    },
    "/chats/{chatId}/send": {
      post: {
        tags: createTags(roleTags.shared, moduleTags.chat),
        summary: "Stream a chat response",
        description:
          "Send a message to the chat and stream the AI model's response.",
        security: bearerSecurity,
        parameters: [pathParam("chatId", "Chat identifier.")],
        requestBody: jsonBody({
          type: "object",
          properties: {
            content: { type: "string" },
            modelId: { type: "integer" },
            chatType: {
              type: "string",
              enum: [
                "STANDARD",
                "DEEP_RESEARCH",
                "IMAGE_GENERATION",
                "WEB_SEARCH",
                "VISION",
              ],
            },
            userMessageId: { type: "integer" },
            assistantMessageId: { type: "integer" },
            attachmentIds: { type: "array", items: { type: "integer" } },
          },
          required: ["content", "modelId"],
        }),
        responses: {
          200: {
            description: "Server-sent events stream",
            content: {
              "text/event-stream": {
                schema: { $ref: "#/components/schemas/StreamEnvelope" },
              },
            },
          },
        },
      },
    },
    "/chats/{chatId}/prepare-multi": {
      post: {
        tags: createTags(roleTags.shared, moduleTags.chat),
        summary: "Prepare multi-model chat",
        description:
          "Prepare a message to be sent to multiple AI models simultaneously.",
        security: bearerSecurity,
        parameters: [pathParam("chatId", "Chat identifier.")],
        requestBody: jsonBody({
          type: "object",
          properties: {
            content: { type: "string" },
            attachmentIds: { type: "array", items: { type: "integer" } },
            chatType: {
              type: "string",
              enum: [
                "STANDARD",
                "DEEP_RESEARCH",
                "IMAGE_GENERATION",
                "WEB_SEARCH",
                "VISION",
              ],
            },
          },
          required: ["content"],
        }),
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Multi-model chat prepared",
          ),
        },
      },
    },
    "/chats/{chatId}/messages/{messageId}/edit-prepare-multi": {
      post: {
        tags: createTags(roleTags.shared, moduleTags.chat),
        summary: "Prepare edited multi-model chat",
        description: "Re-prepare an edited message for multi-model processing.",
        security: bearerSecurity,
        parameters: [
          pathParam("chatId", "Chat identifier."),
          pathParam("messageId", "User message identifier."),
        ],
        requestBody: jsonBody({
          type: "object",
          properties: {
            content: { type: "string" },
            chatType: {
              type: "string",
              enum: [
                "STANDARD",
                "DEEP_RESEARCH",
                "IMAGE_GENERATION",
                "WEB_SEARCH",
                "VISION",
              ],
            },
          },
          required: ["content"],
        }),
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Edited multi-model chat prepared",
          ),
        },
      },
    },
    "/chats/{chatId}/messages/{messageId}/regenerate": {
      post: {
        tags: createTags(roleTags.shared, moduleTags.chat),
        summary: "Regenerate a chat response",
        description:
          "Re-generate an AI response for a previously sent message.",
        security: bearerSecurity,
        parameters: [
          pathParam("chatId", "Chat identifier."),
          pathParam("messageId", "User message identifier."),
        ],
        requestBody: jsonBody({
          type: "object",
          properties: {
            modelId: { type: "integer" },
            chatType: {
              type: "string",
              enum: [
                "STANDARD",
                "DEEP_RESEARCH",
                "IMAGE_GENERATION",
                "WEB_SEARCH",
                "VISION",
              ],
            },
          },
          required: ["modelId"],
        }),
        responses: {
          200: {
            description: "Server-sent events stream",
            content: {
              "text/event-stream": {
                schema: { $ref: "#/components/schemas/StreamEnvelope" },
              },
            },
          },
        },
      },
    },
    "/chats/{chatId}/responses/{responseId}/feedback": {
      post: {
        tags: createTags(roleTags.shared, moduleTags.chat),
        summary: "Submit chat response feedback",
        description:
          "Provide feedback (thumbs up/down) on an AI-generated response.",
        security: bearerSecurity,
        parameters: [
          pathParam("chatId", "Chat identifier."),
          pathParam("responseId", "Model response identifier."),
        ],
        requestBody: jsonBody(toSwagger(feedbackSchema)),
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Feedback updated successfully",
          ),
        },
      },
    },
    "/chats/{chatId}/messages/{messageId}/edit": {
      post: {
        tags: createTags(roleTags.shared, moduleTags.chat),
        summary: "Edit a message and resend",
        description:
          "Modify a previously sent message and generate a new response.",
        security: bearerSecurity,
        parameters: [
          pathParam("chatId", "Chat identifier."),
          pathParam("messageId", "Original message identifier."),
        ],
        requestBody: jsonBody({
          type: "object",
          properties: {
            content: { type: "string" },
            modelId: { type: "integer" },
            chatType: {
              type: "string",
              enum: [
                "STANDARD",
                "DEEP_RESEARCH",
                "IMAGE_GENERATION",
                "WEB_SEARCH",
                "VISION",
              ],
            },
          },
          required: ["content", "modelId"],
        }),
        responses: {
          200: {
            description: "Server-sent events stream",
            content: {
              "text/event-stream": {
                schema: { $ref: "#/components/schemas/StreamEnvelope" },
              },
            },
          },
        },
      },
    },
    "/chats/{chatId}/continue": {
      post: {
        tags: createTags(roleTags.shared, moduleTags.chat),
        summary: "Continue a partially streamed chat",
        description: "Resume streaming a response that was interrupted.",
        security: bearerSecurity,
        parameters: [pathParam("chatId", "Chat identifier.")],
        requestBody: jsonBody({
          type: "object",
          properties: {
            messageId: { type: "integer" },
            modelId: { type: "integer" },
          },
          required: ["messageId", "modelId"],
        }),
        responses: {
          200: {
            description: "Server-sent events stream",
            content: {
              "text/event-stream": {
                schema: { $ref: "#/components/schemas/StreamEnvelope" },
              },
            },
          },
        },
      },
    },
    "/messages": {
      post: {
        tags: createTags(roleTags.shared, moduleTags.message),
        summary: "Create message",
        description: "Create a new message in a chat conversation.",
        security: bearerSecurity,
        requestBody: jsonBody(toSwagger(createMessageSchema)),
        responses: {
          201: successResponse(
            genericObjectSchema,
            "Message created successfully",
          ),
        },
      },
    },
    "/messages/enhance": {
      post: {
        tags: createTags(roleTags.shared, moduleTags.message),
        summary: "Enhance a prompt",
        description: "Use AI to improve and expand a user's prompt text.",
        security: bearerSecurity,
        requestBody: jsonBody(toSwagger(enhancePromptSchema)),
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Prompt enhanced successfully",
          ),
        },
      },
    },
    "/messages/starred": {
      get: {
        tags: createTags(roleTags.shared, moduleTags.message),
        summary: "List starred responses",
        description:
          "Retrieve all starred/bookmarked responses with pagination. Searches response content. Supports `page`, `pageSize`, `search`, and `sort`.",
        security: bearerSecurity,
        parameters: [...paginationParams],
        responses: {
          200: paginatedSuccessResponse(
            "Starred responses fetched successfully",
          ),
        },
      },
    },
    "/messages/responses/{responseId}/star": {
      patch: {
        tags: createTags(roleTags.shared, moduleTags.message),
        summary: "Star or unstar a response",
        description: "Bookmark a favorite AI response for later reference.",
        security: bearerSecurity,
        parameters: [pathParam("responseId", "Model response identifier.")],
        requestBody: jsonBody(toSwagger(starResponseSchema)),
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Response star updated successfully",
          ),
        },
      },
    },
    "/model-responses/complete": {
      post: {
        tags: createTags(roleTags.shared, moduleTags.modelResponse),
        summary: "Persist a completed model response",
        description: "Save a fully streamed AI response to the database.",
        security: bearerSecurity,
        requestBody: jsonBody(toSwagger(completeResponseSchema)),
        responses: {
          201: successResponse(
            genericObjectSchema,
            "Response completed successfully",
          ),
        },
      },
    },
    "/attachments/presend": {
      post: {
        tags: createTags(roleTags.shared, moduleTags.attachment),
        summary: "Upload an attachment before sending a message",
        description: "Upload a file to attach to a message before sending it.",
        security: bearerSecurity,
        requestBody: multipartBody(
          { file: { type: "string", format: "binary" } },
          ["file"],
        ),
        responses: {
          201: successResponse(
            genericObjectSchema,
            "File uploaded successfully",
          ),
        },
      },
    },
    "/attachments": {
      post: {
        tags: createTags(roleTags.shared, moduleTags.attachment),
        summary: "Upload an attachment linked to an existing message",
        description: "Attach a file to an already-sent message in a chat.",
        security: bearerSecurity,
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  messageId: { type: "integer" },
                  file: { type: "string", format: "binary" },
                },
                required: ["messageId", "file"],
              },
            },
          },
        },
        responses: {
          201: successResponse(
            genericObjectSchema,
            "Attachment uploaded successfully",
          ),
        },
      },
    },
    "/attachments/{id}/download": {
      get: {
        tags: createTags(roleTags.public, moduleTags.attachment),
        summary: "Download attachment",
        description: "Download a file attachment by its ID.",
        parameters: [pathParam("id", "Attachment identifier.")],
        responses: {
          200: {
            description: "Binary file download with the original filename",
            content: {
              "application/octet-stream": {
                schema: { type: "string", format: "binary" },
              },
            },
          },
        },
      },
    },
    "/attachments/{id}": {
      delete: {
        tags: createTags(roleTags.shared, moduleTags.attachment),
        summary: "Delete a presend attachment",
        description: "Remove an attachment that was uploaded but not yet sent.",
        security: bearerSecurity,
        parameters: [pathParam("id", "Attachment identifier.")],
        responses: {
          200: successResponse(nullSchema, "Attachment deleted successfully"),
        },
      },
    },
    "/wallet": {
      get: {
        tags: createTags(roleTags.shared, moduleTags.wallet),
        summary: "Get wallet",
        description:
          "Retrieve the current wallet balance and details for the authenticated user.",
        security: bearerSecurity,
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Wallet fetched successfully",
          ),
        },
      },
    },
    "/wallet/transactions": {
      get: {
        tags: createTags(roleTags.shared, moduleTags.wallet),
        summary: "List wallet transactions",
        description:
          "Retrieve transaction history for the user's wallet with filtering options. Searches referenceId and transaction type. Supports `type`, `walletId`, `sort`, `page`, and `pageSize`.",
        security: bearerSecurity,
        parameters: [
          ...paginationParams,
          ...exactFilterParams([
            {
              name: "type",
              schema: { type: "string" },
              description:
                "Filter by transaction type (for example CREDIT or DEBIT).",
              example: "DEBIT",
            },
            {
              name: "walletId",
              schema: { type: "integer" },
              description: "Filter by wallet identifier.",
              example: 10,
            },
          ]),
        ],
        responses: {
          200: paginatedSuccessResponse("Transactions fetched successfully"),
        },
      },
    },
    "/subscription/create": {
      post: {
        tags: createTags(roleTags.shared, moduleTags.subscription),
        summary: "Create subscription",
        description:
          "Create a new subscription plan for the authenticated user.",
        security: bearerSecurity,
        requestBody: jsonBody(toSwagger(createSubscriptionSchema)),
        responses: {
          201: successResponse(
            genericObjectSchema,
            "Subscription created successfully",
          ),
        },
      },
    },
    "/subscription/enable-autopay": {
      post: {
        tags: createTags(roleTags.shared, moduleTags.subscription),
        summary: "Enable subscription auto-pay",
        description:
          "Enable automatic payment renewal for the current subscription.",
        security: bearerSecurity,
        requestBody: jsonBody(toSwagger(createSubscriptionSchema)),
        responses: {
          200: successResponse(
            genericObjectSchema,
            "AutoPay enablement initiated",
          ),
        },
      },
    },
    "/subscription/disable-autopay": {
      post: {
        tags: createTags(roleTags.shared, moduleTags.subscription),
        summary: "Disable subscription auto-pay",
        description:
          "Turn off automatic payment renewal for the current subscription.",
        security: bearerSecurity,
        responses: {
          200: successResponse(genericObjectSchema, "AutoPay disabled"),
        },
      },
    },
    "/subscription/cancel": {
      post: {
        tags: createTags(roleTags.shared, moduleTags.subscription),
        summary: "Cancel current subscription",
        description: "Cancel the user's active subscription plan.",
        security: bearerSecurity,
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Subscription cancelled successfully",
          ),
        },
      },
    },
    "/subscription/cancel-pending": {
      post: {
        tags: createTags(roleTags.shared, moduleTags.subscription),
        summary: "Cancel pending subscription",
        description: "Cancel a pending or upcoming subscription renewal.",
        security: bearerSecurity,
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Pending subscription cancelled successfully",
          ),
        },
      },
    },
    "/subscription/current": {
      get: {
        tags: createTags(roleTags.shared, moduleTags.subscription),
        summary: "Get current subscription",
        description:
          "Retrieve the user's active or most recent subscription details.",
        security: bearerSecurity,
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Subscription fetched successfully",
          ),
        },
      },
    },
    "/subscription/webhooks/cashfree": {
      post: {
        tags: createTags(roleTags.public, moduleTags.subscription),
        summary: "Cashfree subscription webhook",
        description:
          "Receives Cashfree subscription events and updates local subscription state.",
        responses: {
          200: successResponse(genericObjectSchema, "Webhook processed"),
        },
      },
    },
    "/plans": {
      get: {
        tags: createTags(roleTags.public, moduleTags.plan),
        summary: "List plans",
        description:
          "Retrieve all available subscription plans. Searches plan name. Supports `isActive`, `sort`, `page`, and `pageSize`.",
        parameters: [
          ...paginationParams,
          ...exactFilterParams([
            {
              name: "isActive",
              schema: { type: "boolean" },
              description: "Filter by active status.",
              example: true,
            },
          ]),
        ],
        responses: {
          200: paginatedSuccessResponse("Plans fetched successfully"),
        },
      },
      post: {
        tags: createTags(roleTags.admin, moduleTags.plan),
        summary: "Create plan",
        description: "Create a new subscription plan (admin only).",
        security: bearerSecurity,
        requestBody: jsonBody(toSwagger(createPlanSchema)),
        responses: {
          201: successResponse(
            genericObjectSchema,
            "Plan created successfully",
          ),
        },
      },
    },
    "/plans/{id}": {
      get: {
        tags: createTags(roleTags.shared, moduleTags.plan),
        summary: "Get plan",
        description: "Retrieve details of a specific subscription plan.",
        security: bearerSecurity,
        parameters: [pathParam("id", "Plan identifier.")],
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Plan fetched successfully",
          ),
        },
      },
      put: {
        tags: createTags(roleTags.admin, moduleTags.plan),
        summary: "Update plan",
        description: "Update an existing subscription plan (admin only).",
        security: bearerSecurity,
        parameters: [pathParam("id", "Plan identifier.")],
        requestBody: jsonBody(toSwagger(updatePlanSchema)),
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Plan updated successfully",
          ),
        },
      },
      delete: {
        tags: createTags(roleTags.admin, moduleTags.plan),
        summary: "Delete plan",
        description: "Delete a subscription plan (admin only).",
        security: bearerSecurity,
        parameters: [pathParam("id", "Plan identifier.")],
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Plan deleted successfully",
          ),
        },
      },
    },
    "/usage-logs/daily-by-model": {
      get: {
        tags: createTags(roleTags.shared, moduleTags.usageLog),
        summary: "Daily usage totals by model",
        description: "Retrieve daily API usage statistics grouped by AI model.",
        security: bearerSecurity,
        parameters: [
          queryParam(
            "days",
            { type: "integer", minimum: 1, maximum: 90 },
            "Number of days to return, capped at 90.",
            30,
          ),
        ],
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Daily usage by model fetched successfully",
          ),
        },
      },
    },
    "/usage-logs": {
      get: {
        tags: createTags(roleTags.shared, moduleTags.usageLog),
        summary: "List usage logs",
        description:
          "Retrieve detailed API usage logs. Searches by user first name, last name, and email. Supports `userId`, `modelId`, `chatId`, `createdAt`, `createdAt_min`, `createdAt_max`, `sort`, `page`, and `pageSize`.",
        security: bearerSecurity,
        parameters: [
          ...paginationParams,
          ...exactFilterParams([
            {
              name: "userId",
              schema: { type: "integer" },
              description: "Filter by user identifier.",
              example: 12,
            },
            {
              name: "modelId",
              schema: { type: "integer" },
              description: "Filter by model identifier.",
              example: 4,
            },
            {
              name: "chatId",
              schema: { type: "integer" },
              description: "Filter by chat identifier.",
              example: 88,
            },
            {
              name: "createdAt",
              schema: { type: "string", format: "date-time" },
              description: "Filter by exact creation timestamp.",
            },
          ]),
          ...rangeFilterParams([
            {
              name: "createdAt",
              schema: { type: "string", format: "date-time" },
              description: "Filter usage logs by createdAt range.",
            },
          ]),
        ],
        responses: {
          200: paginatedSuccessResponse("Usage logs fetched successfully"),
        },
      },
    },
    "/models": {
      get: {
        tags: createTags(roleTags.public, moduleTags.model),
        summary: "List models",
        description:
          "Retrieve all available AI models. Searches model name and external ID. Supports `isActive`, `modelProviderId`, `sort`, `page`, and `pageSize`.",
        parameters: [
          ...paginationParams,
          ...exactFilterParams([
            {
              name: "isActive",
              schema: { type: "boolean" },
              description: "Filter by active status.",
              example: true,
            },
            {
              name: "modelProviderId",
              schema: { type: "integer" },
              description: "Filter by provider identifier.",
              example: 2,
            },
          ]),
        ],
        responses: {
          200: paginatedSuccessResponse("Models fetched successfully"),
        },
      },
      post: {
        tags: createTags(roleTags.admin, moduleTags.model),
        summary: "Create model",
        description: "Create a new AI model configuration (admin only).",
        security: bearerSecurity,
        requestBody: jsonBody(toSwagger(createModelSchema)),
        responses: {
          201: successResponse(
            genericObjectSchema,
            "Model created successfully",
          ),
        },
      },
    },
    "/models/{id}": {
      get: {
        tags: createTags(roleTags.shared, moduleTags.model),
        summary: "Get model",
        description: "Retrieve details of a specific AI model.",
        security: bearerSecurity,
        parameters: [pathParam("id", "Model identifier.")],
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Model fetched successfully",
          ),
        },
      },
      put: {
        tags: createTags(roleTags.admin, moduleTags.model),
        summary: "Update model",
        description: "Update an AI model configuration (admin only).",
        security: bearerSecurity,
        parameters: [pathParam("id", "Model identifier.")],
        requestBody: jsonBody(toSwagger(updateModelSchema)),
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Model updated successfully",
          ),
        },
      },
      delete: {
        tags: createTags(roleTags.admin, moduleTags.model),
        summary: "Delete model",
        description: "Delete an AI model configuration (admin only).",
        security: bearerSecurity,
        parameters: [pathParam("id", "Model identifier.")],
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Model deleted successfully",
          ),
        },
      },
    },
    "/model-providers": {
      get: {
        tags: createTags(roleTags.shared, moduleTags.modelProvider),
        summary: "List model providers",
        description:
          "Retrieve all AI model providers. Searches provider name and description. Supports `isActive`, `sort`, `page`, and `pageSize`.",
        security: bearerSecurity,
        parameters: [
          ...paginationParams,
          ...exactFilterParams([
            {
              name: "isActive",
              schema: { type: "boolean" },
              description: "Filter by active status.",
              example: true,
            },
          ]),
        ],
        responses: {
          200: paginatedSuccessResponse("Model providers fetched successfully"),
        },
      },
      post: {
        tags: createTags(roleTags.admin, moduleTags.modelProvider),
        summary: "Create model provider",
        description: "Create a new AI provider configuration (admin only).",
        security: bearerSecurity,
        requestBody: jsonBody(toSwagger(createModelProviderSchema)),
        responses: {
          201: successResponse(
            genericObjectSchema,
            "Model provider created successfully",
          ),
        },
      },
    },
    "/model-providers/{id}": {
      get: {
        tags: createTags(roleTags.shared, moduleTags.modelProvider),
        summary: "Get model provider",
        description: "Retrieve details of a specific AI model provider.",
        security: bearerSecurity,
        parameters: [pathParam("id", "Provider identifier.")],
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Model provider fetched successfully",
          ),
        },
      },
      put: {
        tags: createTags(roleTags.admin, moduleTags.modelProvider),
        summary: "Update model provider",
        description: "Update an AI provider configuration (admin only).",
        security: bearerSecurity,
        parameters: [pathParam("id", "Provider identifier.")],
        requestBody: jsonBody(toSwagger(updateModelProviderSchema)),
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Model provider updated successfully",
          ),
        },
      },
      delete: {
        tags: createTags(roleTags.admin, moduleTags.modelProvider),
        summary: "Delete model provider",
        description: "Delete an AI provider configuration (admin only).",
        security: bearerSecurity,
        parameters: [pathParam("id", "Provider identifier.")],
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Model provider deleted successfully",
          ),
        },
      },
    },
    "/preferences": {
      get: {
        tags: createTags(roleTags.shared, moduleTags.preferences),
        summary: "Get user preferences",
        description:
          "Retrieve the authenticated user's settings and preferences.",
        security: bearerSecurity,
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Preferences fetched successfully",
          ),
        },
      },
      put: {
        tags: createTags(roleTags.shared, moduleTags.preferences),
        summary: "Update user preferences",
        description:
          "Update the authenticated user's settings and preferences.",
        security: bearerSecurity,
        requestBody: jsonBody({ type: "object", additionalProperties: true }),
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Preferences updated successfully",
          ),
        },
      },
    },
    "/assistants": {
      get: {
        tags: createTags(roleTags.shared, moduleTags.assistant),
        summary: "List assistants",
        description:
          "Retrieve all available AI assistant templates. Searches assistant name and description. Supports `isActive`, `sort`, `page`, and `pageSize`.",
        security: bearerSecurity,
        parameters: [
          ...paginationParams,
          ...exactFilterParams([
            {
              name: "isActive",
              schema: { type: "boolean" },
              description: "Filter by active status.",
              example: true,
            },
          ]),
        ],
        responses: {
          200: paginatedSuccessResponse("Assistants fetched successfully"),
        },
      },
      post: {
        tags: createTags(roleTags.admin, moduleTags.assistant),
        summary: "Create assistant",
        description: "Create a new AI assistant template (admin only).",
        security: bearerSecurity,
        requestBody: jsonBody(toSwagger(createAssistantSchema)),
        responses: {
          201: successResponse(
            genericObjectSchema,
            "Assistant created successfully",
          ),
        },
      },
    },
    "/assistants/{id}": {
      get: {
        tags: createTags(roleTags.shared, moduleTags.assistant),
        summary: "Get assistant",
        description: "Retrieve details of a specific AI assistant template.",
        security: bearerSecurity,
        parameters: [pathParam("id", "Assistant identifier.")],
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Assistant fetched successfully",
          ),
        },
      },
      put: {
        tags: createTags(roleTags.admin, moduleTags.assistant),
        summary: "Update assistant",
        description: "Update an AI assistant template (admin only).",
        security: bearerSecurity,
        parameters: [pathParam("id", "Assistant identifier.")],
        requestBody: jsonBody(toSwagger(updateAssistantSchema)),
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Assistant updated successfully",
          ),
        },
      },
      delete: {
        tags: createTags(roleTags.admin, moduleTags.assistant),
        summary: "Delete assistant",
        description: "Delete an AI assistant template (admin only).",
        security: bearerSecurity,
        parameters: [pathParam("id", "Assistant identifier.")],
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Assistant deleted successfully",
          ),
        },
      },
    },
    "/assistants/{id}/toggle": {
      patch: {
        tags: createTags(roleTags.admin, moduleTags.assistant),
        summary: "Toggle assistant active state",
        description: "Enable or disable an AI assistant template (admin only).",
        security: bearerSecurity,
        parameters: [pathParam("id", "Assistant identifier.")],
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Assistant toggled successfully",
          ),
        },
      },
    },
    "/contexts/sidebar": {
      get: {
        tags: createTags(roleTags.shared, moduleTags.context),
        summary: "Get sidebar contexts",
        description:
          "Retrieve contexts organized for sidebar display. Supports `search` and `folderId` for the sidebar groupings.",
        security: bearerSecurity,
        parameters: [
          queryParam(
            "search",
            { type: "string" },
            "Search title and memory text.",
          ),
          queryParam(
            "folderId",
            {
              oneOf: [{ type: "integer" }, { type: "string", enum: ["null"] }],
            },
            "Filter folder contexts for a specific folder identifier.",
            1,
          ),
        ],
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Sidebar contexts fetched successfully",
          ),
        },
      },
    },
    "/contexts": {
      get: {
        tags: createTags(roleTags.shared, moduleTags.context),
        summary: "List contexts",
        description:
          "Retrieve user contexts (knowledge bases). Searches title and memory. Supports `type`, `isAutoSelected`, `folderId`, `sort`, `page`, and `pageSize`.",
        security: bearerSecurity,
        parameters: [
          ...paginationParams,
          ...exactFilterParams([
            {
              name: "type",
              schema: { type: "string", enum: ["GLOBAL", "FOLDER", "CUSTOM"] },
              description: "Filter by context type.",
              example: "GLOBAL",
            },
            {
              name: "isAutoSelected",
              schema: { type: "boolean" },
              description: "Filter by auto-selected status.",
              example: true,
            },
            {
              name: "folderId",
              schema: { type: "integer" },
              description: "Filter by folder identifier.",
              example: 7,
            },
          ]),
        ],
        responses: {
          200: paginatedSuccessResponse("Contexts fetched successfully"),
        },
      },
      post: {
        tags: createTags(roleTags.shared, moduleTags.context),
        summary: "Create context",
        description: "Create a new knowledge base context.",
        security: bearerSecurity,
        requestBody: jsonBody(toSwagger(createContextSchema)),
        responses: {
          201: successResponse(
            genericObjectSchema,
            "Context created successfully",
          ),
        },
      },
    },
    "/contexts/{id}": {
      get: {
        tags: createTags(roleTags.shared, moduleTags.context),
        summary: "Get context",
        description: "Retrieve details of a specific context.",
        security: bearerSecurity,
        parameters: [pathParam("id", "Context identifier.")],
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Context fetched successfully",
          ),
        },
      },
      put: {
        tags: createTags(roleTags.shared, moduleTags.context),
        summary: "Update context",
        description: "Update an existing context's information.",
        security: bearerSecurity,
        parameters: [pathParam("id", "Context identifier.")],
        requestBody: jsonBody(toSwagger(updateContextSchema)),
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Context updated successfully",
          ),
        },
      },
      delete: {
        tags: createTags(roleTags.shared, moduleTags.context),
        summary: "Delete context",
        description: "Delete a context and remove it from all chats.",
        security: bearerSecurity,
        parameters: [pathParam("id", "Context identifier.")],
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Context deleted successfully",
          ),
        },
      },
    },
    "/dashboard/summary": {
      get: {
        tags: createTags(roleTags.shared, moduleTags.dashboard),
        summary: "Get dashboard summary",
        description:
          "Retrieve dashboard metrics and summary statistics for the user.",
        security: bearerSecurity,
        responses: {
          200: successResponse(
            genericObjectSchema,
            "Dashboard summary fetched successfully",
          ),
        },
      },
    },
    "/payments/subscribe-one-time/create": {
      post: {
        tags: createTags(roleTags.shared, moduleTags.payment),
        summary: "Create one-time subscription payment",
        description: "Initiate a one-time payment for a subscription plan.",
        security: bearerSecurity,
        requestBody: jsonBody(toSwagger(createSubscribeOneTimeSchema)),
        responses: {
          201: successResponse(
            genericObjectSchema,
            "One-time payment initiated",
          ),
        },
      },
    },
    "/payments/webhooks/cashfree": {
      post: {
        tags: createTags(roleTags.public, moduleTags.payment),
        summary: "Cashfree payment webhook",
        description:
          "Receives one-time payment events and updates the local subscription and wallet state.",
        responses: {
          200: successResponse(genericObjectSchema, "Webhook processed"),
        },
      },
    },
  },
};

const buildSpec = (allowedTags: ReadonlyArray<string>) => {
  const spec = swaggerJSDoc({
    definition: openapiDefinition as any,
    apis: [],
  }) as any;

  const sourcePaths = spec.paths ?? {};
  const filteredPaths: Record<string, any> = {};

  for (const [path, operations] of Object.entries(sourcePaths)) {
    const keptOperations: Record<string, any> = {};
    for (const [method, operation] of Object.entries(
      operations as Record<string, any>,
    )) {
      const tags: string[] = Array.isArray(operation?.tags)
        ? operation.tags
        : [];

      const isAllowed =
        !allowedTags.length ||
        tags.some((tag) =>
          allowedTags.some(
            (allowedTag) =>
              tag === allowedTag || tag.startsWith(`${allowedTag} / `),
          ),
        );

      if (isAllowed) {
        keptOperations[method] = operation;
      }
    }
    if (Object.keys(keptOperations).length > 0) {
      filteredPaths[path] = keptOperations;
    }
  }

  const usedTags = new Set<string>();
  for (const operations of Object.values(filteredPaths)) {
    for (const operation of Object.values(operations as Record<string, any>)) {
      for (const tag of (operation as any)?.tags ?? []) {
        if (typeof tag === "string") {
          usedTags.add(tag);
        }
      }
    }
  }

  const roleOrder = ["Public", "User", "Admin"];
  const getRoleRank = (tag: string) => {
    for (let i = 0; i < roleOrder.length; i += 1) {
      const role = roleOrder[i];
      if (tag === role || tag.startsWith(`${role} / `)) {
        return i;
      }
    }
    return roleOrder.length;
  };

  const orderedTags = Array.from(usedTags).sort((a, b) => {
    const rankDiff = getRoleRank(a) - getRoleRank(b);
    if (rankDiff !== 0) return rankDiff;

    const aModule = a.includes(" / ") ? a.split(" / ")[1] : "";
    const bModule = b.includes(" / ") ? b.split(" / ")[1] : "";
    if (aModule && bModule) {
      const moduleDiff = aModule.localeCompare(bModule);
      if (moduleDiff !== 0) return moduleDiff;
    }

    return a.localeCompare(b);
  });

  const existingTagDescriptions = new Map<string, string>();
  for (const tag of spec.tags ?? []) {
    if (typeof tag?.name === "string" && typeof tag?.description === "string") {
      existingTagDescriptions.set(tag.name, tag.description);
    }
  }

  const orderedTagDefinitions = orderedTags.map((name) => ({
    name,
    description: existingTagDescriptions.get(name),
  }));

  return {
    ...spec,
    paths: filteredPaths,
    tags: orderedTagDefinitions,
  };
};

export const swaggerSpec = buildSpec([]);
export const userSwaggerSpec = buildSpec(["Public", "User"]);
export const adminSwaggerSpec = buildSpec(["Public", "User", "Admin"]);
