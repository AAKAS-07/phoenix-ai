# TODO: Settings Page Optimization

## Task: Optimize Settings page implementation with proper layout, responsiveness, and navigation

### Plan:
1. **Layout Optimization** (No visual change)
   - [x] Refactor Settings rows using proper flexbox containers
   - [x] Use consistent icon container dimensions (fixed w-10 h-10)
   - [x] Remove margin-left hacks, use proper flex alignment
   - [x] Ensure vertical centering with align-items center

2. **Responsive Refinement**
   - [ ] Add proper responsive breakpoints (xs, sm, md, lg, xl)
   - [ ] Add safe-area inset support for mobile
   - [ ] Ensure fluid width with max-width container
   - [ ] Prevent horizontal scrolling and layout shifts

3. **Nested Routing Fix**
   - [x] Implement route history tracking
   - [x] Create proper back navigation logic
   - [x] Settings Home → Subpage → Back should return to Settings Home
   - [x] Track previous route to determine back behavior

### Implementation Notes:
- This is a vanilla JavaScript + Tailwind CSS project (not React/Next.js)
- Current navigation uses view-switching with showDetailSection/hideDetailSection
- Need to implement history stack for proper back button behavior
- Must maintain identical UI appearance (colors, typography, spacing)

### Files to Modify:
- index.html - Settings page structure and JavaScript navigation logic

### Testing:
- Verify Settings rows are perfectly aligned
- Test responsive behavior on mobile/tablet/desktop
- Test back navigation: Settings → Account Details → Back should return to Settings
- Verify no visual changes to colors, typography, spacing
