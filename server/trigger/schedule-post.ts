import { logger, task } from "@trigger.dev/sdk/v3";

const schedulePostTask = task({
    id: "schedule-post",
    run: async (payload: any, { ctx }) => {
        logger.info("Hello, world!", { payload, ctx });
    },
});