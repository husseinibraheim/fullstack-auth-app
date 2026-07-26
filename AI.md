# AI Usage

I used AI (Claude) throughout this project, but not by just handing over the task
and keeping whatever came back. We started by planning together — talking through
the architecture, the auth approach, and the project structure before any code
was written. Once we agreed on a direction we implemented it together, one
milestone at a time, and I reviewed the output of every prompt before it went
into the project instead of pasting it in blindly.

## Which parts of the code were AI-assisted

Most of the code was written with AI and then checked by me. On the backend that
means the NestJS modules, controllers, DTOs and the Mongoose schema, the global
exception filter, the JWT strategy and guard, and the throttler / helmet / CORS
setup. On the frontend it's the sign-up, sign-in and app pages, the
react-hook-form + zod validation, and the axios interceptors.

What I kept for myself was the architecture, the project structure, the scope of
each step, and every security and trade-off decision.

## What prompts or approaches were effective

The biggest one was planning before coding — asking it to compare options
(feature-based vs layered modules, JWT vs sessions) rather than asking it to just
"write" something. Deciding those on paper saved a lot of rework. Giving each
step a tight scope, "build only this, nothing else," kept it from adding things I
hadn't asked for. And reviewing each output the way I'd review a colleague's PR —
sometimes asking it to argue against its own suggestion — is what caught the
mistakes below.

## What I had to correct or rework

- It suggested a dummy `bcrypt.compare` to hide the timing difference between a
  real and an unknown email on sign-in. I dropped it, because sign-up already
  reveals whether an email exists (409 on a duplicate), so hiding the timing
  channel while that stayed open didn't really buy anything.
- A rate-limit test looked broken at first (all 401s, no 429s). The test was the
  problem, not the code: the requests were slow enough to spill past the
  time window. It worked once I ran them faster.
- The DTO validation wasn't actually running at first, because the global
  `ValidationPipe` hadn't been wired up yet. I moved it in with the DTOs.
- It had `SignInDto` extend `SignUpDto`, which would put the signup password
  rules on the login form. I kept them separate.
- The throttler guard and the JWT guard were registered in separate modules, so
  their order was basically left to chance. I moved them into one place so the
  rate limiter clearly runs first, and checked it.
- The DTOs and schema were full of `!` type assertions. I took them out (and
  turned off the strict flag that required them) since those fields are filled in
  by Mongoose and class-validator anyway.
- A `@Transform` on the DTOs was returning an `any` the linter flagged, so I had
  to type it properly instead of leaving it loose.
- I asked it to add sliding expiration so an active user's token extends
  itself instead of logging them out. We went with a stateless version — the
  server re-issues a near-expiry token in a response header and the client swaps
  it in — with an 8-hour hard cap.