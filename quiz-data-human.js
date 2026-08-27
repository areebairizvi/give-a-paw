// Human anatomy quiz data. Loaded before quiz-engine.js, which reads
// window.QUIZ_CONFIG.
//
// Bone outlines were generated from the skeleton SVG's own geometry: unlike
// the canine diagram (one path per bone, in labelled layers) this drawing is
// a single path holding 328 closed subpaths, so each bone is a subpath -- or,
// for the ribs, hand and foot, a hull over a cluster of them. Limb bones all
// come from the image-right limb, which is the side the drawing separates
// cleanly. Joints stay marker-only: a joint is the space between bones.
//
// The upper-limb sets use human-upper-limb.svg, the same drawing cropped by
// viewBox to the image-right arm. Cropping (rather than a second drawing)
// keeps one source of truth: coordinates are the full-image percentages
// mapped through the crop box, so both views stay in sync if the art
// changes. Regenerate with tools/../scratchpad crop_limb.py + gen_limb.py.
//
// The mandible is deliberately absent. This drawing merges the jaw into the
// same contour as the cranium, so there is no honest outline to give it;
// trace one by hand in the ?dev=1 editor if it is wanted.
window.QUIZ_CONFIG = {
    appId: 'human-quiz-app',
    aliases: {
        'Cranium (skull)': ['skull', 'cranium'],
        'Clavicle': ['collarbone', 'collar bone'],
        'Scapula': ['shoulder blade', 'shoulderblade'],
        'Sternum': ['breastbone', 'breast bone'],
        'Ribs': ['rib', 'ribcage', 'rib cage'],
        'Humerus': ['upper arm bone'],
        'Carpals': ['carpal bones', 'carpus', 'wrist bones'],
        'Metacarpals': ['metacarpal bones'],
        'Phalanges (hand)': ['phalanges', 'finger bones', 'fingers'],
        'Phalanges (foot)': ['phalanges', 'toe bones', 'toes'],
        'Pelvis (hip bone)': ['pelvis', 'hip bone', 'hipbone', 'os coxae'],
        'Sacrum': ['sacral vertebrae'],
        'Femur': ['thigh bone', 'thighbone'],
        'Patella': ['kneecap', 'knee cap'],
        'Tibia': ['shinbone', 'shin bone'],
        'Tarsals': ['tarsal bones', 'tarsus', 'ankle bones'],
        'Metatarsals': ['metatarsal bones'],
        'Cervical vertebrae': ['cervical', 'neck vertebrae', 'neck bones'],
        'Lumbar vertebrae': ['lumbar', 'lower back vertebrae'],
        'Temporomandibular joint': ['tmj', 'jaw joint'],
        'Intervertebral joints': ['intervertebral', 'spinal joints'],
    },
    quizzes: {
        'bones': {
            image: 'human-skeleton.svg', noun: 'bone',
            items: [
                { name: 'Cranium (skull)', x: 48.3, y: 8.6, smooth: 0.5, points: [[56.9, 13.5], [53.8, 12.9], [58.9, 12], [47.9, 11.8], [46.4, 9.7], [56, 11.1], [62.4, 9.4], [59.9, 3.4], [48, 1.6], [36.9, 4.2], [39, 8.6], [44.1, 8], [45.6, 6.5], [44.7, 5.6], [46.2, 6.1], [44.5, 8.2], [39.2, 9], [42.7, 9.7], [43.9, 12.1]] },
                { name: 'Cervical vertebrae', x: 48.7, y: 15.3, smooth: 0.45, points: [[43, 15.8], [45.5, 13.4], [52.3, 13.9], [53.1, 14.9], [53.3, 16], [52.7, 16.3], [46.6, 16.5], [43.1, 16]] },
                { name: 'Clavicle', x: 62.9, y: 18.2, smooth: 0.5, points: [[73.1, 19.2], [74.1, 19], [70.9, 18.2], [63.8, 17.6], [52.5, 17.9], [51.4, 18.1], [52.8, 18.7], [62.9, 18.2]] },
                { name: 'Scapula', x: 66.8, y: 21.6, smooth: 0.5, points: [[67.4, 23.8], [69.6, 22], [68.9, 20.6], [70.7, 19.5], [60.9, 18.8], [63.6, 20.6], [66, 23.6], [67, 24.1]] },
                { name: 'Sternum', x: 47.5, y: 22.1, smooth: 0.5, points: [[48.5, 27.9], [51.4, 25.3], [50.4, 21], [52.5, 20], [52.9, 19.2], [50.6, 18.3], [45.3, 18], [42.6, 18.9], [42.9, 19.8], [45.3, 20.9], [49.9, 20.8], [45.4, 21.2], [44.7, 24.3], [46.1, 24.3], [44.1, 25], [47.2, 28]] },
                { name: 'Ribs', x: 52.3, y: 26.6, smooth: 0.45, points: [[31.8, 20.8], [32.8, 19.9], [38.2, 18], [58.8, 18.4], [62.5, 20.3], [64.9, 22.5], [66.4, 24.4], [67.1, 28.1], [66.6, 31.2], [65.2, 32.9], [49.6, 37.4], [44, 37.4], [32.6, 34]] },
                { name: 'Humerus', x: 73.8, y: 28.9, smooth: 0.5, points: [[70.6, 36.9], [80.2, 35.7], [76.5, 31.9], [77.3, 34.7], [76.1, 32.9], [77.1, 27.1], [76.7, 22.9], [77.4, 20.7], [73.6, 19.5], [71.4, 19.7], [69.5, 20.9], [72.6, 22.4], [73.2, 24.8], [73.2, 30], [72.5, 32.6], [71.5, 34.5], [69.2, 36.3], [69.4, 36.9]] },
                { name: 'Radius', x: 81.3, y: 43, smooth: 0.5, points: [[88.1, 50], [80.4, 38.9], [79.9, 37.1], [75.9, 37.4], [78.2, 39], [82.1, 44.8], [83.3, 47.4], [82.7, 49.6]] },
                { name: 'Ulna', x: 78, y: 43.3, smooth: 0.5, points: [[82.1, 49.5], [82.1, 48.6], [79.9, 43.3], [80.2, 42.8], [77.6, 39], [75, 37.6], [71.9, 37.9], [72.2, 38.5], [74.8, 39.5], [80.6, 49.4], [81.5, 49.8]] },
                { name: 'Carpals', x: 84.4, y: 51.3, smooth: 0.45, points: [[80.8, 50.4], [81.4, 50], [84.2, 50], [88.4, 50.6], [90.1, 52], [89.8, 52.5], [82.3, 52.7], [81.5, 52.6], [80.8, 50.5]] },
                { name: 'Metacarpals', x: 88.3, y: 54.1, smooth: 0.45, points: [[80.8, 54.7], [81.1, 52.7], [90.7, 51.9], [95, 54.2], [95.7, 55.5], [86.6, 55.5]] },
                { name: 'Phalanges (hand)', x: 85.7, y: 57.3, smooth: 0.45, points: [[80.4, 56.9], [80.6, 55.3], [81.1, 55], [91.2, 55.3], [96.1, 56], [92.5, 60.1], [88.8, 60.1], [85.4, 59.4], [80.7, 57.9], [80.4, 57]] },
                { name: 'Lumbar vertebrae', x: 46.5, y: 36.6, smooth: 0.5, points: [[49.8, 41.3], [54.4, 39.8], [50.3, 39.5], [53.3, 38.2], [49.8, 36.9], [52.6, 36.5], [49.7, 35.5], [51.7, 34.2], [44.2, 33.6], [51.1, 32.8], [42.2, 32.7], [43.9, 33.4], [41.7, 34.3], [43.4, 35.9], [41, 36.4], [43.2, 36.7], [43, 37.8], [40.4, 38.5], [43.3, 39.2], [40.9, 39.6]] },
                { name: 'Sacrum', x: 48.5, y: 43, smooth: 0.5, points: [[51.9, 45.8], [56.9, 42.6], [57.1, 41.8], [55.9, 40.9], [47.4, 41.6], [41.2, 40.7], [39.2, 41.6], [40.1, 43], [45.3, 45.7], [49.9, 46.3]] },
                { name: 'Pelvis (hip bone)', x: 60.1, y: 42.3, smooth: 0.5, points: [[61.9, 45.6], [66.7, 43.7], [70.4, 41.3], [66.9, 39.3], [60, 39], [57.5, 39.5], [55.4, 40.6], [57.5, 41.5], [57.7, 42.6], [55, 44.3], [58.3, 43.4], [59.4, 43.9], [55.1, 45.6]] },
                { name: 'Femur', x: 60.2, y: 60.6, smooth: 0.5, points: [[60.2, 70.8], [62.5, 61.4], [68.1, 52.6], [74.1, 48], [73, 47], [66.5, 44.9], [61.9, 46.3], [64.9, 49.4], [60.2, 58.3], [54.4, 65.3], [48.2, 68.7], [49.3, 70.3], [52.8, 70.5], [53.3, 68.1], [58.3, 68.5], [59.4, 69.1], [56.3, 70.6]] },
                { name: 'Patella', x: 55.8, y: 69.3, smooth: 0.5, points: [[56.6, 70.2], [58.5, 69.3], [58.3, 68.7], [54.2, 68.3], [53, 69], [54.1, 70.5]] },
                { name: 'Tibia', x: 53, y: 82.7, smooth: 0.5, points: [[49.8, 91.5], [54.1, 91.3], [54.9, 90.7], [54.5, 82.5], [57.1, 75.4], [60.4, 71.9], [59.7, 71.3], [50, 70.7], [51.6, 74.6], [50.7, 85.4], [50, 87.9], [47.6, 90.8], [48.3, 91.5]] },
                { name: 'Fibula', x: 58, y: 80.1, smooth: 0.5, points: [[55.8, 91.9], [56.3, 91.2], [55.7, 88.2], [56.5, 83.6], [61.4, 73], [60.9, 72.4], [59.6, 73.3], [55.2, 82.5], [55.6, 90.5], [55.1, 91.6]] },
                { name: 'Tarsals', x: 50.9, y: 93.1, smooth: 0.45, points: [[46, 92.8], [47.1, 91.5], [52.2, 91.4], [54.6, 91.8], [56.2, 93.2], [56.3, 95], [51.6, 95.1], [48.2, 94.1], [46.2, 93.1]] },
                { name: 'Metatarsals', x: 55.9, y: 95.6, smooth: 0.45, points: [[52.4, 94.9], [57.2, 94.5], [61.4, 95.5], [60.3, 96.3], [54.4, 96.5], [53.4, 96.3], [52.4, 95.1]] },
                { name: 'Phalanges (foot)', x: 57.5, y: 97, smooth: 0.45, points: [[54.1, 96.7], [55.6, 95.6], [61.8, 96.8], [61.2, 97.5], [58.1, 98.4], [54.2, 96.8]] },
            ],
        },
        'joints': {
            image: 'human-skeleton.svg', noun: 'joint',
            items: [
                { name: 'Temporomandibular joint', x: 57.5, y: 9.6 },
                { name: 'Shoulder joint', x: 70.5, y: 20.5 },
                { name: 'Elbow joint', x: 76, y: 37.5 },
                { name: 'Wrist joint', x: 83.5, y: 50.4 },
                { name: 'Hip joint', x: 58.5, y: 45.2 },
                { name: 'Knee joint', x: 57.5, y: 71.5 },
                { name: 'Ankle joint', x: 51, y: 92 },
                { name: 'Intervertebral joints', x: 47.1, y: 36.2 },
            ],
        },
        'upper-limb-bones': {
            image: 'human-upper-limb.svg', noun: 'bone',
            items: [
                { name: 'Clavicle', x: 18.2, y: 5.8, smooth: 0.5, points: [[37.9, 7.9], [40.3, 7.7], [40.9, 7.6], [40.3, 7.3], [32.8, 5.7], [16.1, 4.4], [-10.6, 5], [-13.2, 5.4], [-9.9, 6.8], [2.8, 5.6], [13.8, 5.6], [24, 6.2], [32.8, 8]] },
                { name: 'Scapula', x: 21.5, y: 11.8, smooth: 0.5, points: [[24.6, 17.4], [29.6, 13.6], [27.7, 11.8], [27.9, 10.8], [32.2, 8.5], [22.8, 7.3], [18.5, 7.7], [9.2, 7], [11.3, 8.7], [15.6, 10.7], [16.6, 12.5], [20.2, 14.7], [21.2, 17], [23.5, 18.2]] },
                { name: 'Humerus', x: 40.3, y: 28.6, smooth: 0.5, points: [[31.9, 45], [54.5, 42.5], [46, 34.5], [47.8, 40.5], [45, 37.2], [44.9, 32.8], [47.2, 24.4], [46.4, 16.4], [48.1, 11.4], [47.1, 10.4], [36.2, 8.4], [29.5, 11.5], [36.7, 14.5], [38.1, 19.5], [38.1, 30.4], [36.4, 36], [34, 40], [28.7, 43.7], [29.2, 45]] },
                { name: 'Radius', x: 57.9, y: 58.1, smooth: 0.5, points: [[73.3, 72.6], [66.9, 65.3], [61.4, 56.4], [55.1, 49.4], [53.9, 45.5], [49.9, 45.2], [44.4, 46.1], [48.3, 47.9], [49.9, 49.4], [51.7, 52.4], [55.1, 55.6], [59.1, 61.7], [61.8, 67.1], [61.6, 69.8], [60.6, 71.8], [72.8, 73.2]] },
                { name: 'Ulna', x: 47.8, y: 56.5, smooth: 0.5, points: [[59, 71.6], [59.1, 69.6], [56, 64.8], [53.8, 58.6], [54.6, 57.4], [48.4, 49.6], [46.4, 48], [42.4, 46.6], [38.8, 46.5], [35.1, 47.2], [34.8, 47.7], [35.7, 48.4], [41.9, 50.6], [45.3, 54.5], [55.6, 71.4], [57.6, 72.3]] },
                { name: 'Carpals', x: 66.6, y: 75.4, smooth: 0.45, points: [[56, 73.6], [57.5, 72.6], [64, 72.6], [74, 73.8], [75.7, 74.3], [77.8, 76.8], [77.8, 77.5], [77.1, 78], [59.5, 78.4], [57.7, 78], [56, 73.7]] },
                { name: 'Metacarpals', x: 69.5, y: 81, smooth: 0.45, points: [[56.9, 82.4], [57.7, 78.5], [79.2, 76.9], [82, 77.8], [87, 80.4], [78.8, 83.7], [69.9, 84], [57.3, 83], [56.9, 82.6]] },
                { name: 'Phalanges', x: 70.4, y: 87.1, smooth: 0.45, points: [[55.9, 87.1], [56.3, 84], [57.1, 83.4], [87.7, 81.2], [89.2, 81.6], [91.1, 85.3], [83.1, 93.6], [74.6, 93.6], [67, 92.2], [56.6, 89.1], [56, 87.3]] },
            ],
        },
        'upper-limb-joints': {
            image: 'human-upper-limb.svg', noun: 'joint',
            items: [
                { name: 'Shoulder joint', x: 25.2, y: 10 },
                { name: 'Elbow joint', x: 49.4, y: 45.2 },
                { name: 'Wrist joint', x: 69.8, y: 74.4 },
                { name: 'Carpometacarpal joint', x: 68.3, y: 78.6 },
                { name: 'Metacarpophalangeal joint', x: 71.2, y: 84.1 },
                { name: 'Proximal interphalangeal joint', x: 73.4, y: 88.5 },
                { name: 'Distal interphalangeal joint', x: 74.6, y: 91.5 },
            ],
        },
    },
};
