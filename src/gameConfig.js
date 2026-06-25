/**
 * Multiple-choice game configuration.
 *
 * Each question has a prompt and a list of answers. Exactly one answer per
 * question must have `correct: true`. The `explanation` text is shown on the
 * death screen when the player selects that wrong answer.
 *
 * The answer order is scrambled automatically on page load and on respawn,
 * so the correct path is different every run.
 */

export const GAME_CONFIG = {
  // Vertical layout constants for the level
  spawnY: 30,
  fallDeathY: -10,

  // Question 1 is presented at the parkour split (2 answers, left/right).
  // Question 2 is presented at the building doors (4 answers).
  questions: [
    {
      prompt: "Which of these is a mammal?",
      answers: [
        { text: "Dolphin", correct: true, explanation: "Dolphins are marine mammals, not fish." },
        { text: "Shark", correct: false, explanation: "Sharks are fish, not mammals." }
      ]
    },
    {
      prompt: "What is the largest planet in our solar system?",
      answers: [
        { text: "Saturn", correct: false, explanation: "Saturn is big, but Jupiter is larger." },
        { text: "Jupiter", correct: true, explanation: "Jupiter is the largest planet in our solar system." },
        { text: "Neptune", correct: false, explanation: "Neptune is the eighth planet and smaller than Jupiter." },
        { text: "Earth", correct: false, explanation: "Earth is the third planet and much smaller than Jupiter." }
      ]
    }
  ]
};
