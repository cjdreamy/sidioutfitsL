<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Data access is browser-side via the generated client with RLS; owner rights come from `user_roles` + `has_role` (first signed-up user becomes admin via trigger). Why: simple, secure without server functions.
- Orders are placed only through the `place_order` SQL function so stock is checked and decremented atomically. Why: prevents overselling.
- Product photos live in a private bucket; uploads store long-lived signed URLs in `products.images`. Why: workspace blocks public buckets.
- Shopping bag lives in localStorage; sign-in is required only at booking. Why: owner wants browsing without sign-up.
