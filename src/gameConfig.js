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

  // Question 1: parkour split (2 answers, left/right platforms).
  // Question 2: building doors (4 answers).
  // Question 3: second-building elevators (3 answers).
  // Question 4: correct-elevator floor menu (4 answers).
  // Question 5: ground-floor garages (3 answers).
  // Question 6: final road lane (2 answers, left/right side of the road).
  questions: [
    {
      prompt: "Is a neural network a type of artificial intelligence?",
      answers: [
        { text: "Yes", correct: true, explanation: "Neural networks are a major family of AI algorithms inspired by the brain." },
        { text: "No", correct: false, explanation: "Neural networks are one of the most common approaches used in modern AI." }
      ]
    },
    {
      prompt: "Which of these is NOT a good task for AI prediction?",
      answers: [
        { text: "Random coin flip", correct: true, explanation: "A fair coin flip is purely random, so no pattern exists for AI to learn." },
        { text: "Weather", correct: false, explanation: "Weather is hard to predict, but AI can use real sensor data to improve forecasts." },
        { text: "Stock prices", correct: false, explanation: "AI models are often used to analyze market trends, even though results are uncertain." },
        { text: "Medical diagnosis", correct: false, explanation: "AI can assist doctors by recognizing patterns in scans and test results." }
      ]
    },
    {
      prompt: "What is NOT needed to use a pretrained AI model?",
      answers: [
        { text: "Training data", correct: true, explanation: "A pretrained model has already learned; you only need it if you want to retrain or fine-tune." },
        { text: "Model weights", correct: false, explanation: "The weights store what the model has learned and are required to run it." },
        { text: "Input to predict", correct: false, explanation: "You need some input data for the model to make a prediction." }
      ]
    },
    {
      prompt: "What is overfitting in machine learning?",
      answers: [
        { text: "Memorizing training data but failing on new data", correct: true, explanation: "Overfitting means the model learns the training examples too closely and generalizes poorly." },
        { text: "Being too simple to learn any pattern", correct: false, explanation: "That is underfitting, not overfitting." },
        { text: "Training loss going up over time", correct: false, explanation: "Rising training loss usually means the model is not learning, not overfitting." },
        { text: "Using too little training data", correct: false, explanation: "Small datasets can cause overfitting, but overfitting itself is poor generalization to new data." }
      ]
    },
    {
      prompt: "Which scenario is an example of reinforcement learning?",
      answers: [
        { text: "A robot learning to walk by trial and reward", correct: true, explanation: "Reinforcement learning learns by taking actions and receiving rewards or penalties." },
        { text: "A model trained on labeled cat photos", correct: false, explanation: "That is supervised learning, because the data already has correct labels." },
        { text: "Grouping customers by purchase habits", correct: false, explanation: "That is unsupervised learning, because there are no predefined labels." }
      ]
    },
    {
      prompt: "What is a major risk of training AI on historical data?",
      answers: [
        { text: "It can learn and repeat past biases", correct: true, explanation: "If the historical data contains unfair patterns, the AI may copy them in its decisions." },
        { text: "It can become outdated and miss recent trends", correct: false, explanation: "That is a real concern, but the bigger ethical risk is that old biases get baked into the model." }
      ]
    }
  ]
};
