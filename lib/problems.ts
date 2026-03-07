export type TestCase = {
  input: Record<string, unknown>;
  expected: unknown;
  displayInput: string;
  displayExpected: string;
};

export type Problem = {
  id: string;
  title: string;
  description: string;
  constraints: string[];
  examples: Array<{ input: string; output: string }>;
  testCases: TestCase[];
  python: { functionName: string };
  java: { className: string; methodName: string };
};

export const twoSumProblem: Problem = {
  id: "two-sum",
  title: "Two Sum",
  description:
    "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.",
  constraints: [
    "2 <= nums.length <= 10⁴",
    "-10⁹ <= nums[i] <= 10⁹",
    "-10⁹ <= target <= 10⁹",
    "Only one valid answer exists.",
  ],
  examples: [
    { input: "nums = [2, 7, 11, 15], target = 9", output: "[0, 1]" },
    { input: "nums = [3, 2, 4], target = 6", output: "[1, 2]" },
  ],
  testCases: [
    {
      input: { nums: [2, 7, 11, 15], target: 9 },
      expected: [0, 1],
      displayInput: "nums = [2, 7, 11, 15], target = 9",
      displayExpected: "[0, 1]",
    },
    {
      input: { nums: [3, 2, 4], target: 6 },
      expected: [1, 2],
      displayInput: "nums = [3, 2, 4], target = 6",
      displayExpected: "[1, 2]",
    },
    {
      input: { nums: [3, 3], target: 6 },
      expected: [0, 1],
      displayInput: "nums = [3, 3], target = 6",
      displayExpected: "[0, 1]",
    },
  ],
  python: { functionName: "two_sum" },
  java: { className: "Solution", methodName: "twoSum" },
};
