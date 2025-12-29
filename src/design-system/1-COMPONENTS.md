# Artwalls Design System - Component Library

## 1. Buttons

### Variants

#### Primary Button
```tsx
// Default state
background: var(--interactive-default)
color: var(--text-inverse)
padding: 12px 24px (--space-3 --space-6)
border-radius: 8px (--radius-md)
font: 14px/20px medium (button-md)
transition: all 150ms ease-out

// Hover
background: var(--interactive-hover)
transform: translateY(-1px)
shadow: var(--shadow-md)

// Active
background: var(--interactive-active)
transform: translateY(0)

// Focus
outline: 2px solid var(--focus-ring)
outline-offset: 2px

// Disabled
background: var(--interactive-disabled)
color: var(--text-tertiary)
cursor: not-allowed
opacity: 0.6

// Loading
opacity: 0.8
cursor: wait
[Contains spinner icon]
```

#### Artist Primary Button (Role-Aware)
```tsx
background: var(--artist-primary)
color: white

// Hover
background: var(--artist-dark)
```

#### Venue Primary Button (Role-Aware)
```tsx
background: var(--venue-primary)
color: white

// Hover
background: var(--venue-dark)
```

#### Secondary Button
```tsx
background: transparent
color: var(--text-primary)
border: 1px solid var(--border-default)

// Hover
background: var(--surface-elevated)
border-color: var(--border-strong)
```

#### Ghost Button
```tsx
background: transparent
color: var(--text-secondary)
border: none

// Hover
background: var(--surface-elevated)
color: var(--text-primary)
```

#### Danger Button
```tsx
background: var(--error)
color: white

// Hover
background: darken(var(--error), 10%)
```

### Sizes

```tsx
// Large
padding: 16px 32px (--space-4 --space-8)
font: 16px/24px medium (button-lg)
min-height: 48px

// Medium (default)
padding: 12px 24px (--space-3 --space-6)
font: 14px/20px medium (button-md)
min-height: 44px

// Small
padding: 8px 16px (--space-2 --space-4)
font: 12px/16px medium (button-sm)
min-height: 32px
```

### Icon Buttons

```tsx
// Square buttons with icon only
padding: 12px (--space-3)
width: 44px
height: 44px
border-radius: 8px (--radius-md)

// Icon size based on button size:
- Large: 24px (--icon-lg)
- Medium: 20px (--icon-md)
- Small: 16px (--icon-sm)
```

---

## 2. Inputs

### Text Input

```tsx
// Default
width: 100%
padding: 12px 16px (--space-3 --space-4)
border: 1px solid var(--border-default)
border-radius: 8px (--radius-md)
background: var(--surface)
color: var(--text-primary)
font: 16px/24px normal (--text-base)

// Placeholder
color: var(--text-tertiary)

// Hover
border-color: var(--border-strong)

// Focus
border-color: var(--focus-ring)
outline: 2px solid var(--focus-ring)
outline-offset: 0

// Error
border-color: var(--error)
outline-color: var(--error)

// Disabled
background: var(--background)
color: var(--text-tertiary)
cursor: not-allowed
```

### Label

```tsx
display: block
font: 14px/20px medium (label)
color: var(--text-primary)
margin-bottom: 8px (--space-2)

// Required indicator
content: "*"
color: var(--error)
margin-left: 4px
```

### Helper Text

```tsx
font: 12px/16px normal (caption)
color: var(--text-tertiary)
margin-top: 4px (--space-1)
```

### Error Message

```tsx
font: 12px/16px normal (caption)
color: var(--error)
margin-top: 4px (--space-1)
display: flex
align-items: center
gap: 4px

[Alert icon] 12px
```

### Input Variants

#### Search Input
```tsx
padding-left: 44px /* Space for icon */

// Icon (positioned absolute)
left: 16px
top: 50%
transform: translateY(-50%)
color: var(--text-tertiary)
size: 20px
```

#### Select / Dropdown
```tsx
appearance: none
padding-right: 40px /* Space for chevron */

// Chevron icon (positioned absolute)
right: 16px
top: 50%
transform: translateY(-50%)
color: var(--text-secondary)
size: 20px
```

#### Textarea
```tsx
min-height: 120px
resize: vertical
padding: 12px 16px
```

---

## 3. Cards

### Base Card

```tsx
background: var(--surface)
border: 1px solid var(--border-subtle)
border-radius: 12px (--radius-lg)
padding: 24px (--space-6)
box-shadow: var(--shadow-sm)

// Hover (if interactive)
box-shadow: var(--shadow-md)
border-color: var(--border-default)
transform: translateY(-2px)
transition: all 200ms ease-out
```

### Card Header

```tsx
margin-bottom: 16px (--space-4)

// Title
font: 20px/28px semibold (--text-xl)
color: var(--text-primary)

// Subtitle
font: 14px/20px normal (--text-sm)
color: var(--text-secondary)
margin-top: 4px
```

### Card Actions

```tsx
margin-top: 24px (--space-6)
display: flex
gap: 12px (--space-3)
justify-content: flex-end
```

### Card Variants

#### Elevated Card
```tsx
box-shadow: var(--shadow-lg)
border: none
```

#### Outlined Card
```tsx
box-shadow: none
border: 2px solid var(--border-default)
```

#### Clickable Card
```tsx
cursor: pointer
transition: all 200ms ease-out

// Hover
box-shadow: var(--shadow-lg)
transform: translateY(-4px)
```

---

## 4. Badges

### Base Badge

```tsx
display: inline-flex
align-items: center
padding: 4px 12px (--space-1 --space-3)
border-radius: 9999px (--radius-full)
font: 12px/16px medium (--text-xs)
white-space: nowrap
```

### Badge Variants

#### Default
```tsx
background: var(--surface-elevated)
color: var(--text-secondary)
border: 1px solid var(--border-default)
```

#### Artist Badge
```tsx
background: var(--artist-light)
color: var(--artist-dark)
border: none

// Dark mode
background: var(--artist-light) /* blue-900 */
color: var(--artist-dark) /* blue-100 */
```

#### Venue Badge
```tsx
background: var(--venue-light)
color: var(--venue-dark)
border: none

// Dark mode
background: var(--venue-light) /* green-900 */
color: var(--venue-dark) /* green-100 */
```

#### Status Badges

**Success**
```tsx
background: var(--success-light)
color: var(--success)
```

**Error**
```tsx
background: var(--error-light)
color: var(--error)
```

**Warning**
```tsx
background: var(--warning-light)
color: var(--warning)
```

**Info**
```tsx
background: var(--info-light)
color: var(--info)
```

#### Dot Badge (with indicator)
```tsx
/* Prepend colored dot */
::before {
  content: ""
  width: 6px
  height: 6px
  border-radius: 50%
  background: currentColor
  margin-right: 6px
}
```

---

## 5. Navigation

### Desktop Navigation Bar

```tsx
position: sticky
top: 0
z-index: var(--z-sticky)
background: var(--surface)
border-bottom: 1px solid var(--border-subtle)
height: 72px
padding: 0 24px

// Container
max-width: 100%
display: flex
align-items: center
justify-content: space-between
```

#### Nav Item (Desktop)

```tsx
// Default
padding: 8px 16px
border-radius: 8px
color: var(--text-secondary)
font: 14px/20px medium
transition: all 150ms ease-out

// Hover
background: var(--surface-elevated)
color: var(--text-primary)

// Active
background: var(--interactive-default)
color: var(--text-inverse)

// Focus
outline: 2px solid var(--focus-ring)
outline-offset: 2px
```

### Mobile Navigation (Hamburger Menu)

```tsx
// Trigger Button
width: 44px
height: 44px
padding: 12px
border-radius: 8px

// Drawer
position: fixed
top: 0
right: 0
width: 280px
height: 100vh
background: var(--surface)
box-shadow: var(--shadow-xl)
z-index: var(--z-modal)
transform: translateX(100%)
transition: transform 300ms ease-in-out

// Open state
transform: translateX(0)
```

#### Mobile Nav Item

```tsx
padding: 12px 16px
border-radius: 8px
color: var(--text-secondary)
font: 16px/24px medium
display: flex
align-items: center
gap: 12px

// Icon
size: 20px

// Active
background: var(--surface-elevated)
color: var(--text-primary)
```

### Admin Sidebar

```tsx
width: 256px
height: 100vh
background: var(--surface)
border-right: 1px solid var(--border-subtle)
display: flex
flex-direction: column
position: fixed
left: 0
top: 0
```

#### Sidebar Item

```tsx
padding: 12px 16px
margin: 0 12px
border-radius: 8px
color: var(--text-secondary)
font: 14px/20px medium
display: flex
align-items: center
gap: 12px
transition: all 150ms ease-out

// Icon
size: 20px

// Hover
background: var(--surface-elevated)

// Active
background: var(--interactive-default)
color: var(--text-inverse)
```

---

## 6. Modals / Dialogs

### Base Modal

```tsx
// Backdrop
position: fixed
inset: 0
background: rgba(0, 0, 0, 0.5)
z-index: var(--z-modal-backdrop)
backdrop-filter: blur(4px)

// Dialog
position: fixed
top: 50%
left: 50%
transform: translate(-50%, -50%)
z-index: var(--z-modal)
background: var(--surface-overlay)
border-radius: 16px (--radius-xl)
box-shadow: var(--shadow-xl)
max-width: 560px
width: calc(100% - 32px)
max-height: calc(100vh - 64px)
overflow-y: auto
```

### Modal Header

```tsx
padding: 24px 24px 16px
border-bottom: 1px solid var(--border-subtle)

// Title
font: 24px/32px semibold (--text-2xl)
color: var(--text-primary)

// Close button (top-right)
position: absolute
top: 24px
right: 24px
width: 32px
height: 32px
border-radius: 8px
color: var(--text-tertiary)

// Close button hover
background: var(--surface-elevated)
color: var(--text-primary)
```

### Modal Body

```tsx
padding: 24px
```

### Modal Footer

```tsx
padding: 16px 24px 24px
border-top: 1px solid var(--border-subtle)
display: flex
gap: 12px
justify-content: flex-end
```

### Modal Animations

```tsx
// Enter
animation: modal-enter 200ms ease-out

@keyframes modal-enter {
  from {
    opacity: 0
    transform: translate(-50%, -48%) scale(0.96)
  }
  to {
    opacity: 1
    transform: translate(-50%, -50%) scale(1)
  }
}

// Exit
animation: modal-exit 150ms ease-in

@keyframes modal-exit {
  from {
    opacity: 1
    transform: translate(-50%, -50%) scale(1)
  }
  to {
    opacity: 0
    transform: translate(-50%, -48%) scale(0.96)
  }
}
```

---

## 7. Tables

### Base Table

```tsx
width: 100%
background: var(--surface)
border: 1px solid var(--border-subtle)
border-radius: 12px (--radius-lg)
overflow: hidden
```

### Table Header

```tsx
background: var(--surface-elevated)
border-bottom: 1px solid var(--border-subtle)

// Header cell
padding: 12px 24px (--space-3 --space-6)
font: 12px/16px medium (--text-xs)
color: var(--text-secondary)
text-align: left
text-transform: uppercase
letter-spacing: 0.05em
```

### Table Body

```tsx
// Row
border-bottom: 1px solid var(--border-subtle)
transition: background 150ms ease-out

// Row hover
background: var(--surface-elevated)

// Row active/selected
background: var(--artist-surface) /* or venue-surface based on context */

// Cell
padding: 16px 24px (--space-4 --space-6)
font: 14px/20px normal (--text-sm)
color: var(--text-primary)
vertical-align: middle
```

### Empty State (in table)

```tsx
padding: 64px 24px
text-align: center

// Icon
size: 48px
color: var(--text-tertiary)
margin-bottom: 16px

// Title
font: 18px/28px semibold
color: var(--text-primary)
margin-bottom: 8px

// Description
font: 14px/20px normal
color: var(--text-secondary)
```

---

## 8. Tabs

### Tab List

```tsx
display: flex
gap: 24px
border-bottom: 1px solid var(--border-subtle)
```

### Tab

```tsx
// Default
padding: 12px 16px
border-bottom: 2px solid transparent
color: var(--text-secondary)
font: 14px/20px medium
cursor: pointer
transition: all 150ms ease-out
white-space: nowrap

// Hover
color: var(--text-primary)

// Active
border-bottom-color: var(--interactive-default)
color: var(--text-primary)

// Focus
outline: 2px solid var(--focus-ring)
outline-offset: -2px
border-radius: 4px (--radius-sm)
```

### Tab Panel

```tsx
padding: 24px 0
```

---

## 9. Toast / Notification

### Base Toast

```tsx
position: fixed
bottom: 24px
right: 24px
z-index: var(--z-tooltip)
background: var(--surface-overlay)
border: 1px solid var(--border-default)
border-radius: 12px (--radius-lg)
box-shadow: var(--shadow-xl)
padding: 16px
max-width: 420px
display: flex
gap: 12px
align-items: flex-start

// Animation (slide in from right)
animation: toast-enter 300ms ease-out

@keyframes toast-enter {
  from {
    transform: translateX(100%)
    opacity: 0
  }
  to {
    transform: translateX(0)
    opacity: 1
  }
}
```

### Toast Variants

#### Success Toast
```tsx
border-left: 4px solid var(--success)

// Icon
color: var(--success)
size: 20px
```

#### Error Toast
```tsx
border-left: 4px solid var(--error)

// Icon
color: var(--error)
size: 20px
```

#### Warning Toast
```tsx
border-left: 4px solid var(--warning)

// Icon
color: var(--warning)
size: 20px
```

#### Info Toast
```tsx
border-left: 4px solid var(--info)

// Icon
color: var(--info)
size: 20px
```

---

## 10. Loading States

### Skeleton

```tsx
background: linear-gradient(
  90deg,
  var(--surface-elevated) 0%,
  var(--border-subtle) 50%,
  var(--surface-elevated) 100%
)
background-size: 200% 100%
animation: skeleton-shimmer 1.5s infinite
border-radius: 4px (--radius-sm)

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0 }
  100% { background-position: -200% 0 }
}
```

#### Skeleton Variants
```tsx
// Text line
height: 16px
width: 100% /* or specific width like 80%, 60% */
margin-bottom: 8px

// Card
height: 200px
width: 100%
border-radius: 12px

// Avatar
width: 40px
height: 40px
border-radius: 50%

// Button
height: 44px
width: 120px
border-radius: 8px
```

### Spinner

```tsx
width: 20px
height: 20px
border: 2px solid var(--border-default)
border-top-color: var(--interactive-default)
border-radius: 50%
animation: spinner-rotate 0.6s linear infinite

@keyframes spinner-rotate {
  to { transform: rotate(360deg) }
}
```

---

## 11. Dropdowns / Menus

### Base Dropdown

```tsx
// Trigger (button or input)
[Button component styles]

// Menu container
position: absolute
top: calc(100% + 8px)
left: 0
z-index: var(--z-dropdown)
background: var(--surface-overlay)
border: 1px solid var(--border-default)
border-radius: 8px (--radius-md)
box-shadow: var(--shadow-lg)
min-width: 200px
max-height: 320px
overflow-y: auto
padding: 8px
```

### Menu Item

```tsx
padding: 8px 12px
border-radius: 6px
color: var(--text-primary)
font: 14px/20px normal
cursor: pointer
display: flex
align-items: center
gap: 8px
transition: background 150ms ease-out

// Hover
background: var(--surface-elevated)

// Active/Selected
background: var(--artist-surface)
color: var(--artist-primary)

// Focus
outline: 2px solid var(--focus-ring)
outline-offset: -2px

// Disabled
color: var(--text-tertiary)
cursor: not-allowed
opacity: 0.5
```

### Menu Divider

```tsx
height: 1px
background: var(--border-subtle)
margin: 8px 0
```

---

## 12. Empty States

### Structure

```tsx
display: flex
flex-direction: column
align-items: center
justify-content: center
text-align: center
padding: 64px 24px

// Icon container
width: 80px
height: 80px
background: var(--surface-elevated)
border-radius: 50%
display: flex
align-items: center
justify-content: center
margin-bottom: 24px

// Icon
size: 40px
color: var(--text-tertiary)

// Title
font: 20px/28px semibold
color: var(--text-primary)
margin-bottom: 8px

// Description
font: 14px/20px normal
color: var(--text-secondary)
max-width: 400px
margin-bottom: 24px

// CTA Button
[Primary button styles]
```

---

## 13. Forms

### Form Group

```tsx
margin-bottom: 24px (--space-6)

// Label + Input spacing
gap: 8px (--space-2)
```

### Form Row (horizontal fields)

```tsx
display: grid
grid-template-columns: repeat(2, 1fr)
gap: 16px (--space-4)

// Mobile
grid-template-columns: 1fr
```

### Checkbox

```tsx
width: 20px
height: 20px
border: 2px solid var(--border-default)
border-radius: 4px (--radius-sm)
cursor: pointer
transition: all 150ms ease-out

// Checked
background: var(--interactive-default)
border-color: var(--interactive-default)

// Checkmark (icon)
color: white
size: 14px

// Focus
outline: 2px solid var(--focus-ring)
outline-offset: 2px

// Disabled
background: var(--surface-elevated)
border-color: var(--border-default)
cursor: not-allowed
```

### Radio Button

```tsx
width: 20px
height: 20px
border: 2px solid var(--border-default)
border-radius: 50%
cursor: pointer
transition: all 150ms ease-out

// Checked (inner dot)
border-color: var(--interactive-default)
::after {
  content: ""
  width: 10px
  height: 10px
  background: var(--interactive-default)
  border-radius: 50%
  position: absolute
  top: 50%
  left: 50%
  transform: translate(-50%, -50%)
}

// Focus
outline: 2px solid var(--focus-ring)
outline-offset: 2px
```

### Toggle / Switch

```tsx
width: 44px
height: 24px
background: var(--surface-elevated)
border: 2px solid var(--border-default)
border-radius: 9999px
position: relative
cursor: pointer
transition: all 200ms ease-out

// Knob
width: 16px
height: 16px
background: white
border-radius: 50%
position: absolute
left: 2px
top: 2px
transition: transform 200ms ease-out

// Checked
background: var(--interactive-default)
border-color: var(--interactive-default)

// Checked knob
transform: translateX(20px)

// Focus
outline: 2px solid var(--focus-ring)
outline-offset: 2px
```

---

## Component Checklist

Every component MUST include:
- ✅ Default state
- ✅ Hover state
- ✅ Active state
- ✅ Focus state (visible ring)
- ✅ Disabled state
- ✅ Loading state (where applicable)
- ✅ Error state (for inputs/forms)
- ✅ Light mode styles
- ✅ Dark mode styles
- ✅ Keyboard navigation support
- ✅ Screen reader accessibility
- ✅ Responsive behavior
- ✅ Animation/transition timing

---

This component library provides complete specifications for building consistent, accessible UI components across the Artwalls platform.
