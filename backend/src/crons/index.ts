import subscriptionExpiryCron from "./subscriptionExpiry.js";
import manualSubscriptionExpiryCron from "./manualSubscriptionExpiry.js";
import manualRenewalRemindersCron from "./manualRenewalReminders.js";

export const startCronJobs = () => {
    subscriptionExpiryCron();
    manualSubscriptionExpiryCron();
    manualRenewalRemindersCron();
    console.log("⏰ Cron jobs started");
};
