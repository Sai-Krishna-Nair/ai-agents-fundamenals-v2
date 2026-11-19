export const JUDGE_PROMPT = `You are an evaluation judge. Score the agent's response on a scale of 1-10.
        Scoring criteria:
        - 10: Response fully addresses the task using tool results correctly
        - 7-9: Response is mostly correct with minor issues
        - 4-6: Response partially addresses the task
        - 1-3: Response is mostly incorrect or irrelevant`