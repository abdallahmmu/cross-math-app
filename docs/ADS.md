# Making money from ads

What is already wired, what you actually have to sign up for, what it pays, and the rules
that get apps removed if you ignore them.

Short version: **the web build earns through a portal like Poki or CrazyGames, the mobile
build earns through AdMob.** They are different businesses with different paperwork, and
the code change for either one is about forty lines, because the game already talks to an
interface rather than to an ad network.

---

## 1. What is already in place

```ts
// core/ads/ads.service.ts
export abstract class AdsService {
  abstract readonly state: Signal<RewardedAdState>;
  abstract readonly progress: Signal<number>;
  abstract showRewarded(): Promise<boolean>;   // true when the reward is earned
}
```

`FakeAdsService` implements it with a two-second overlay that is clearly labelled a
placeholder. Everything downstream is real and finished:

- The hint counter in the top bar opens the offer sheet from any screen.
- The sheet offers **buy with coins** or **watch a video**, and the video option is capped
  at `ECONOMY.rewardedAd.maxPerDay` (3) per calendar day, tracked in the save.
- A watched video grants a hint and, when the sheet was opened mid-puzzle, spends it on the
  spot.
- The whole flow is already tested end to end.

So "implementing ads" means writing one class and binding it in `app.config.ts`:

```ts
{ provide: AdsService, useClass: AdMobAdsService }
```

No page, store or component changes. That is the entire point of the interface.

---

## 2. The two formats, and which one to care about

| Format | What it is | Pays | Use it? |
| --- | --- | --- | --- |
| **Rewarded video** | Opt-in, ~30s, gives something in return | **Best eCPM by far**, often 5-10x a banner | **Yes.** Already designed in. |
| Interstitial | Full screen between levels, not opt-in | Middling, and it costs retention | Maybe, sparingly |
| Banner | A strip pinned to the screen | Very low | No - it would fight the board for space |
| Native | Styled into your own UI | Fiddly | No |

For a puzzle game, rewarded video is where the money is, and it is the only format players
tend not to resent, because they chose it and got something. That is why the hint economy
is built around it and not around banners.

**Interstitials are the one thing worth adding later**: one between levels, no more than
once every three or four levels, never immediately after a rewarded video, and never on the
first session. If you add them, put the frequency cap in `ECONOMY` with the other numbers.

---

## 3. Mobile: AdMob through Capacitor

This is the main earner, and it needs the app to be in the stores first.

### 3.1 Sign-up

1. An **AdMob account** (`admob.google.com`), linked to an AdSense account for payment.
   Needs a real address and tax information; you get paid by bank transfer once the balance
   passes the threshold (**$100** in most countries).
2. Create an **app** entry in AdMob for iOS and another for Android. Each gets an App ID.
3. Create an **ad unit** of type *Rewarded* under each app. Each gets an Ad Unit ID.
4. Until your app is actually published, use Google's **test ad unit IDs**. Clicking your
   own live ads - even once, even by accident - is what gets AdMob accounts banned. This is
   not a theoretical risk; it is the single most common way small developers lose the
   account.

### 3.2 The code

```bash
npm i @capacitor-community/admob
```

```ts
// core/ads/admob-ads.service.ts
import { Injectable, signal } from '@angular/core';
import { AdMob, RewardAdPluginEvents, type AdMobRewardItem } from '@capacitor-community/admob';
import { AdsService, type RewardedAdState } from './ads.service';

@Injectable()
export class AdMobAdsService extends AdsService {
  private readonly currentState = signal<RewardedAdState>('idle');
  override readonly state = this.currentState.asReadonly();
  override readonly progress = signal(0).asReadonly(); // the network owns the UI

  private ready = false;

  private async initialise(): Promise<void> {
    if (this.ready) return;
    await AdMob.initialize({ initializeForTesting: false });
    // The consent flow from §5 belongs here, before the first request.
    this.ready = true;
  }

  override async showRewarded(): Promise<boolean> {
    if (this.currentState() === 'playing') return false;
    this.currentState.set('playing');
    try {
      await this.initialise();
      await AdMob.prepareRewardVideoAd({ adId: AD_UNIT_ID });

      const rewarded = new Promise<boolean>((resolve) => {
        const granted = AdMob.addListener(RewardAdPluginEvents.Rewarded, (_item: AdMobRewardItem) => {
          void granted.then((h) => h.remove());
          resolve(true);
        });
        const dismissed = AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
          void dismissed.then((h) => h.remove());
          resolve(false);   // closed early: no reward, and that is correct
        });
      });

      await AdMob.showRewardVideoAd();
      return await rewarded;
    } catch {
      return false;         // no fill, no network: the player is simply told to try later
    } finally {
      this.currentState.set('idle');
    }
  }
}
```

Two things that matter in that sketch:

- **Dismissed resolves `false`.** Closing the video early must not grant the hint. The
  existing UI already handles a `false` return by telling the player nothing was earned.
- **Every failure path returns `false` rather than throwing.** No fill is normal, especially
  in small markets and on a new app - it must never look like a bug to the player.

### 3.3 Server-side verification, later

A client saying "I watched it" is worth nothing once there is an account and a server. AdMob
supports **SSV (server-side verification)**: you give it a callback URL, it calls your API
when a reward is genuinely earned, and your API grants the hint. That is the `POST
/api/hints/reward` endpoint mentioned in [ONLINE.md](ONLINE.md). Until accounts exist,
client-side granting is fine, because the only thing a cheat gains is a hint in their own
save.

---

## 4. Web: portals, not AdSense

**AdSense is the wrong tool here.** It is built for content pages, its rewarded format is
not generally available, and a game with a board that fills the screen has nowhere honest to
put a banner. Do not build the web monetisation around it.

The web build earns by being published on a games portal. They provide the ads, the traffic
and the payments; you provide the game.

| Portal | Model | Notes |
| --- | --- | --- |
| **Poki** | Revenue share, roughly 50/50 | Biggest reach, real curation, needs their SDK |
| **CrazyGames** | Revenue share | Easier to get onto, good for a first release |
| **GameDistribution** | Revenue share, wide syndication | Lowest bar, lowest rate |
| Itch.io | Direct sales/donations, no ads | Good for feedback, not for income |

### 4.1 How it works in code

Their SDKs expose almost exactly the interface you already have:

```ts
// core/ads/poki-ads.service.ts  (sketch)
override async showRewarded(): Promise<boolean> {
  this.currentState.set('playing');
  try {
    await PokiSDK.rewardedBreak();   // resolves true when watched through
    return true;
  } catch {
    return false;
  } finally {
    this.currentState.set('idle');
  }
}
```

They also want `gameplayStart()` and `gameplayStop()` called as the player enters and leaves
a puzzle, so their interstitials never interrupt play. Those are two calls in the Play page.

### 4.2 The one build problem

Their SDK loads from **their** domain, which breaks the current "no external requests"
property and would fail in a packaged Capacitor app. So it belongs behind a build
configuration, not in the default bundle:

```
ng build --configuration=poki
```

with a `fileReplacements` entry swapping the ads provider. The default build stays exactly as
it is today: no network, works offline.

### 4.3 What they check before accepting you

- Loads fast (yours is ~75 kB transferred - fine).
- No external links, no cross-promotion to other portals.
- No account wall, no forced sign-up.
- Works on mobile web and with a mouse.
- Mute control (you have one).
- Original art and name - the reason the game is called Sumday and not the name of the game
  it is inspired by.

---

## 5. The rules that actually get apps removed

1. **Never click your own ads.** Use test ad units in development. This is the number one
   cause of AdMob bans and there is no appeal worth counting on.
2. **Never nag or trick.** No "watch a video to continue", no ads over a button, no
   countdown that starts before the video is visible. Rewarded means opt-in.
3. **Children's privacy is not optional.** A colourful maths puzzle will attract under-13
   players. If the store listing targets children, or you know a meaningful share of your
   audience is, you must use child-directed treatment (`tagForChildDirectedTreatment`),
   which serves non-personalised ads and pays noticeably less. Getting this wrong is a
   COPPA problem, not just a policy one. **Decide before the first store submission.**
4. **Consent.** In the EU/UK you need a certified CMP before requesting ads - Google's
   **UMP SDK** is free and does the job. In the US, state privacy laws are heading the same
   way. No consent flow means no European revenue and a policy violation.
5. **Declare it in the store listing.** Both stores require "contains ads" to be set.

---

## 6. What to expect

Rough, and deliberately conservative. Rewarded eCPM varies enormously by country - US/UK/DE
traffic can be 5-20x Tier 3 traffic for the same ad.

| | Pessimistic | Reasonable |
| --- | --- | --- |
| Rewarded eCPM | $5 | $12 |
| Videos watched per daily player | 0.4 | 1.2 |
| **Revenue per 1,000 daily players per day** | **$2** | **$14** |

So 1,000 daily players is somewhere between $60 and $430 a month. The number that actually
moves is **daily players**, not the ad setup - a 20% better eCPM is noise next to a 3x
audience. Spend the effort on retention (the streak, the leagues in ONLINE.md) rather than
on squeezing the ad stack.

The current cap of 3 free hints a day is the right starting point: it puts a ceiling on how
much ad revenue a single player can generate, which sounds bad and is not - it stops hints
from being infinite, which is what protects the coin economy the shop depends on.

---

## 7. The order I would do it in

1. **Ship the web build to CrazyGames first.** Lowest bar, real players, real feedback, and
   it pays something while you build the mobile version. One `PokiAdsService`-shaped class
   and a build configuration.
2. **Then Capacitor + AdMob**, with test ad units until the app is actually live.
3. **Then Poki**, which is stricter but bigger, once the game has been polished by real
   players.
4. **Then server-side verification**, when accounts exist and a hint is worth cheating for.

Nothing above changes the game. Every step is a new implementation of `AdsService` and a
line in `app.config.ts`.
