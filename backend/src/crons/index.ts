import tokenResetCron from "./tokenReset";
import subscriptionExpiryCron from "./subscriptionExpiry";

export const startCronJobs = () => {
    tokenResetCron();
    subscriptionExpiryCron();
    console.log("⏰ Cron jobs started");
};
