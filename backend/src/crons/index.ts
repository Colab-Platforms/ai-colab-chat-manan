import subscriptionExpiryCron from "./subscriptionExpiry.js";
import manualSubscriptionExpiryCron from "./manualSubscriptionExpiry.js";
import manualRenewalRemindersCron from "./manualRenewalReminders.js";
import contextDistillationCron from "./contextDistillation.js";
import documentGenerationCron from "./documentGeneration.js";

export const startCronJobs = () => {
    subscriptionExpiryCron();
    manualSubscriptionExpiryCron();
    manualRenewalRemindersCron();
    contextDistillationCron();
    documentGenerationCron();
    console.log("⏰ Cron jobs started");
};
