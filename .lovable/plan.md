

# ScriptAI — Implementation Plan

## Phase 1: Foundation & Auth
1. **Set up Lovable Cloud** with database tables: `clients`, `scripts`, `activity_log`, `user_roles`, and `profiles` with proper RLS policies and roles (admin/collaborator)
2. **Design system** — dark theme with navy (#050D1F), electric blue (#0066FF), cyan neon (#00D4FF), purple (#6B2FFF) gradients, glassmorphism cards, futuristic typography
3. **Login/Register page** — email + password auth via Supabase, role assignment on signup, protected routes
4. **Animated particle background** component for dashboard and key pages

## Phase 2: Dashboard
5. **Dashboard page** — animated counters for total scripts, published count, avg performance score
6. **Line chart** of script activity over time (using Recharts)
7. **Top 5 scripts** quick view section with performance badges

## Phase 3: Script Generator (AI-Powered)
8. **Script Generator form** — client dropdown, social network selector, objective, tone, and topic fields
9. **Lovable AI integration** via edge function — generates 3 script variations per request
10. **Script variation cards** — copy, save as draft, and approve actions on each card

## Phase 4: Script Library
11. **Table view** — searchable, filterable list with columns for client, network, status badge, collaborator avatar, performance score
12. **Kanban view** — drag-and-drop board with columns: Draft → Approved → Published → With Metrics
13. **Filters** — client, social network, status, collaborator, date range

## Phase 5: Script Details & History
14. **Script Detail page** — full view with edit capability, status timeline, metrics display, format tags
15. **Version history** — save versions on edit, diff view comparing original vs. final
16. **Format tags system** — manual tag assignment + AI-suggested tags (Opening Hook, Conflict, Emotional CTA, etc.)

## Phase 6: AI-Powered Features
17. **AI predictive performance score** — edge function that analyzes script against historical top performers, returns 0–100 score with explanation
18. **Semantic search** — AI-powered search bar that finds scripts by topic, emotion, hook type with match highlighting

## Phase 7: Analytics & Admin
19. **Client Top 10 page** — client dropdown, ranked list of best scripts with metrics (reach, interactions, views) and format tags
20. **Admin panel** — manage team members, assign clients to collaborators, view activity logs

## Phase 8: Polish
21. **Smooth page transitions** and micro-animations throughout (fade-ins, scale effects, hover states)
22. **Mobile responsive** adjustments for all pages

