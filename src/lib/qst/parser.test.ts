import { describe, expect, it } from "vitest";
import { normalizeQstJson, parseQst } from "./parser";

describe("parseQst", () => {
  it("parses metadata, unicode, markdown and multiple correct answers", () => {
    const result = parseQst(`
@title: Biology Quiz
@time_limit: 30
@shuffle: true
@category: Science
# comment

? Select **prime** numbers 🧪
+ 2
+ 3
- 4
- 9
`);

    expect(result.ok).toBe(true);
    expect(result.data.metadata).toMatchObject({ title: "Biology Quiz", timeLimit: 30, shuffle: true });
    expect(result.data.questions[0].type).toBe("multiple_choice");
    expect(result.data.questions[0].answers.filter((answer) => answer.isCorrect)).toHaveLength(2);
  });

  it("supports legacy star markers from common QST examples", () => {
    const result = parseQst("? Select prime numbers\n* 2\n* 3\n- 4\n- 9");
    expect(result.ok).toBe(true);
    expect(result.data.questions[0].answers.filter((answer) => answer.isCorrect).map((answer) => answer.text)).toEqual(["2", "3"]);
  });

  it("reports line-numbered validation errors", () => {
    const result = parseQst(`
- orphan
?
+ same
- same
`);

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("ANSWER_WITHOUT_QUESTION");
    expect(result.issues.map((issue) => issue.code)).toContain("EMPTY_QUESTION");
    expect(result.issues.map((issue) => issue.code)).toContain("DUPLICATE_ANSWER");
  });

  it("normalizes parser output for storage", () => {
    const result = parseQst("? What is 2 + 2?\n+ 4\n- 5");
    expect(normalizeQstJson(result.data).questions[0]).toMatchObject({
      order: 0,
      type: "single_choice",
      answers: [
        { order: 0, text: "4", isCorrect: true },
        { order: 1, text: "5", isCorrect: false },
      ],
    });
  });
});
