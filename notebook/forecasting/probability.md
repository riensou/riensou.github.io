# Probability, proper scoring rules, and calibration

> "Let $\mathcal{X}$ be a $\sigma$-algebra."

## Probability

Probability is a tricky thing to rigorously define while relating it to how we actually use it everyday. The following is an *attempt* to do so:
 
- Probability 1: assigns numbers to logical statements. credence to a statement based on evidence (metalinguistic)
  - note that evidence need not be statistical in nature
  - example: chance of rain tomorrow, legal cases
- Probability 2: relative frequencies of events (object language)
  - example: games of chance (dice, cards, coins)
  - example: RNGs
  - example: statistical physics
- Probability 0: math. Kolmogorov's axioms. (abstract world)
  - $p_1,\ldots,p_n\geq0$ and $\sum_{i=1}^np_i=1$
  - $\sigma$-algebras, measures, integrals, etc.

What unites each of these concepts is some loose notion of a probability function. That is, a way of mapping some event to a number. It turns out that each of these areas will follow [Kolmogorov's axioms](https://en.wikipedia.org/wiki/Probability_axioms), which can be roughly stated as:
1. $p>0$
2. for constant occurences, $p=1$
3. for mutually exclusive outcomes $A,B$: $p(A\text{ or }B)=p(A)+p(B)$

> "Be pragmatic with probability, not pedantic."

It turns out that to be a "good" (where good refers to having a good score) forecaster, one must abide by the probability axioms in their forecasts.

## Calibration

A forecast is calibrated if on the events where one predicts $p=\alpha$, then the associated outcome occurs with frequency $\alpha$.
$$\mathbb{E}\left[Y=1\mid p=\alpha\right]=\alpha$$

Recall the Brior Score (BS): $\sum_{i=1}^n(p_i-y_i)^2$. Note that for $y_i=(-1)^i$, and $p_i=0.5$, our prediction is calibrated, but not good. Conversely, a small Brior Score need not imply a calibrated prediction.

## Proper Scoring Rules

Suppose that we believe that $y\sim\mathcal{D}$, where $\mathcal{D}$ corresponds to a probability function $q$. Then, $s$ is a proper scoring rule if
$$\mathbb{E}_{y\sim\mathcal{D}}[s(q,y)]\geq\mathbb{E}_{y\sim\mathcal{D}}[s(p,y)].$$

Apparently there is a one-to-one correspondence between proper scoring rules and something called [Bregman Divergences](https://en.wikipedia.org/wiki/Bregman_divergence).
