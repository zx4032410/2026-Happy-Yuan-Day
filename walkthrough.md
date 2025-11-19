# Loading Experience Optimization

I have improved the loading experience by adding a Skeleton Screen, Loading Hints, and Estimated Time.

## Changes

### 1. Skeleton Screen
- Added a `skeleton-layer` in `index.html` that mimics the game's layout (header, canvas, controls).
- Added CSS animations (`skeleton-pulse`) in `style.css` to create a breathing effect.
- The skeleton screen is displayed behind the semi-transparent loading overlay, giving the user a preview of the UI structure.

### 2. Loading Hints
- Added a `loading-hint` element in the loading overlay.
- Implemented logic in `game.js` to cycle through fun messages based on loading progress:
    - "正在召喚小媛寶..." (Summoning Xiao Yuan Bao...)
    - "正在準備應援棒..." (Preparing light sticks...)
    - "正在佈置舞台..." (Setting up the stage...)
    - "正在確認音響設備..." (Checking audio equipment...)
    - "小媛寶即將登場..." (Xiao Yuan Bao is coming...)

### 3. Estimated Time
- Added a `loading-time` element.
- Implemented logic in `game.js` to calculate the estimated remaining time based on the average loading speed of assets.

### 4. Visual Polish
- Updated `.loading-overlay` in `style.css` to be semi-transparent with a backdrop blur effect (`backdrop-filter: blur(8px)`), allowing the skeleton screen to be seen underneath.

## Verification Results

### Automated Tests
- N/A (Visual changes)

### Manual Verification
- **Loading Start**: The user sees the Skeleton Screen with a blurred overlay.
- **Progress**: The progress bar fills up, hint text changes, and estimated time updates.
- **Completion**: The overlay fades out, and the Skeleton Screen is hidden, revealing the actual game UI.

## Files Modified
- `index.html`: Added skeleton structure and new text elements.
- `style.css`: Added skeleton styles and updated overlay styles.
- `game.js`: Implemented loading logic.
