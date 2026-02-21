import tokenResetCron from "./tokenReset.js";
import subscriptionExpiryCron from "./subscriptionExpiry.js";

export const startCronJobs = () => {
    tokenResetCron();
    subscriptionExpiryCron();
    console.log("⏰ Cron jobs started");
};
