# Fever Time Visual Effects Implementation

I have added visual effects that trigger when Fever Time is active, enhancing the "juice" and excitement of the game.

## Changes

### 1. CSS Animations
- **Screen Shake**: 
    - Added `@keyframes shake` and `.fever-shake` class.
    - **Configurable Parameters**: Added CSS variables in `style.css` (around line 2155) for easy adjustment:
        - `--shake-intensity-x`: Horizontal shake amount (default: 2px)
        - `--shake-intensity-y`: Vertical shake amount (default: 2px)
        - `--shake-rotation`: Rotation amount (default: 1deg)
- **Background Pulse**: Added `@keyframes backgroundPulse` and `.fever-background` class to shift the background hue and brightness.

### 2. Game Logic
- Updated `activateFeverTime` in `game.js` to add both `.fever-shake` (to game container) and `.fever-background` (to body).
- Updated `endFeverTime` in `game.js` to remove these classes.

## Verification Results

### Manual Verification
- **Fever Time Activation**: 
    - The game container gently shakes according to the configured intensity.
    - The background pulses with changing colors and brightness.
- **Fever Time End**: All effects stop immediately.

## Files Modified
- `style.css`: Added shake and pulse animations with configurable variables. Added `.format-btn` and `.share-btn` styles to fix text visibility.
- `game.js`: Added logic to toggle shake and background classes.
