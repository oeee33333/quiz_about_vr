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
      prompt: "Is this game a virtual reality (VR) experience?",
      answers: [
        { text: "No", correct: true, explanation: "This is a regular browser game played on a flat screen with a mouse and keyboard." },
        { text: "Yes", correct: false, explanation: "VR requires a headset that surrounds your vision; this game runs in a normal web browser." }
      ]
    },
    {
      prompt: "Which of these is NOT a typical health risk associated with VR?",
      answers: [
        { text: "Starvation", correct: true, explanation: "Starvation is not caused by using VR; it would only happen if someone forgot to eat for a very long time." },
        { text: "Eye fatigue", correct: false, explanation: "Staring at screens close to the eyes for long sessions can tire the eyes." },
        { text: "Neck pain", correct: false, explanation: "Headsets add weight and long sessions can strain the neck." },
        { text: "Tripping over", correct: false, explanation: "Users can lose awareness of real surroundings and trip over furniture or cables." }
      ]
    },
    {
      prompt: "What does AR stand for?",
      answers: [
        { text: "Augmented Reality", correct: true, explanation: "AR adds digital objects on top of the real world." },
        { text: "Artificial Reality", correct: false, explanation: "The correct term is Augmented Reality." },
        { text: "Advanced Rendering", correct: false, explanation: "Rendering is a graphics technique, not what AR stands for." }
      ]
    },
    {
      prompt: "Which of these is NOT an example of augmented reality?",
      answers: [
        { text: "Exploring Mars in a fully immersed environment", correct: true, explanation: "A fully immersed digital environment blocks out the real world, which is virtual reality." },
        { text: "A phone filter placing virtual furniture in your room", correct: false, explanation: "This overlays digital objects onto the real world through a camera, which is AR." },
        { text: "A pilot's heads-up display showing flight data", correct: false, explanation: "Overlaying data onto the real view is a classic AR use case." },
        { text: "A museum app showing a dinosaur over real bones", correct: false, explanation: "Adding digital content on top of a real exhibit is augmented reality." }
      ]
    },
    {
      prompt: "What is one way to reduce motion sickness in VR?",
      answers: [
        { text: "Keep the display fast and responsive to head movement", correct: true, explanation: "Low delay and smooth motion help prevent the conflict between what the eyes see and the inner ear feels." },
        { text: "Make the headset heavier", correct: false, explanation: "A heavier headset would add neck strain, not reduce motion sickness." },
        { text: "Block all sounds from the real world", correct: false, explanation: "Sound is not the main cause of motion sickness; visual lag is." }
      ]
    },
    {
      prompt: "For a driving assist application, which technology should be used?",
      answers: [
        { text: "AR", correct: true, explanation: "AR can overlay directions on the real road without blocking the driver's view." },
        { text: "VR", correct: false, explanation: "VR would block the real world, making it dangerous to use while driving." }
      ]
    }
  ]
};
