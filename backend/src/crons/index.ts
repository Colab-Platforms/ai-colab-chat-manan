import subscriptionExpiryCron from "./subscriptionExpiry.js";

export const startCronJobs = () => {
    subscriptionExpiryCron();
    console.log("⏰ Cron jobs started");
};
