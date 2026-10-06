Following alongside MIT's opencourseware on [Projection Theory](https://ocw.mit.edu/courses/18-156-projection-theory-spring-2025/).

# Introduction to Projection Theory
## Projections of point sets

First, consider the following setup. Let $V\subset \mathbb{R}^d$ be a subspace. Let $\Pi_V:\mathbb{R}^d\to V$ be the [orthogonal projection](https://textbooks.math.gatech.edu/ila/projections.html). In projection theory, we study $X\subset\mathbb{R}^d$ and $\Pi_V X$ for many different $V$.

```figure
assets/figures/projection-overview
```
Observations:
- $X$, 8 dots
- $\Pi_{V_1}X$, 4 dots
- $\Pi_{V_2}X$, 8 dots

Intuition: the $V_1$ type situation is "rare". Goal: make this precise.

Suppose $X\subset\mathbb{R}^2$ is a finite set. Some notation: 
- let $|X| =$ the cardinality of $X$, and 
- let $\text{Gr}(k,d)=\{V\subset\mathbb{R}^d:V\text{ is k-dim subspace}\}$, the [Grassmannian](https://en.wikipedia.org/wiki/Grassmannian).

Then, define 
$$E_S(X)=\{V\in\text{Gr}(1,2):\left|\Pi_V(X)\right|\leq S\}$$
Question: estimate $|E_S(X)|$ in terms of $S, |X|$.

Example: a squared grid. Let $X=\{(a,b):a,b\in\mathbb{Z} \text{ and } 1\leq a,b\leq N\}$.
```figure
assets/figures/grid-projections
```
Notice that if we project $X$ at a rational angle, then $|\Pi_V X|$ will be small.

We will later find that $|E_S(X)|\approx \frac{S^2}{|X|}$ for $|X|^{1/2}\leq S\leq\frac{1}{2}|X|$. [Erdős](https://en.wikipedia.org/wiki/Paul_Erd%C5%91s) conjectured that the grid makes these the largest.

Theorem ([Szemerédi–Trotter](https://en.wikipedia.org/wiki/Szemer%C3%A9di%E2%80%93Trotter_theorem), '82): if $X\subset\mathbb{R}^2$ and $S\leq\frac{|X|}{2}$, then $|E_S(X)|\leq 1+ c\cdot\frac{S^2}{|X|}$.

The proof of this theorem is based on topology.

## Projections of functions

Let $f:\mathbb{R}^d\to\mathbb{C}$. Imagine this as a density function (something like a CAT scan for example).
```figure
assets/figures/fibers
```
In this case, for $y\in V$, we define the projection of $f$ onto $V$ as
$$\Pi_V f(y)=\int_{\Pi_V^{-1}(y)}f(x)d\text{vol}_F,$$
where $F=\Pi_V^{-1}(y)$ is the fiber over $y$ and $d\text{vol}_F$ is the volume measure on $F$.

For a region $U\subset V$, the fibers over $U$ sweep out the slab $\Pi_V^{-1}(U)$ (shaded above), and we have
$$\int_U\Pi_V f(y)\,d\text{vol}_V(y)=\int_{\Pi_V^{-1}(U)}f(x)\,dx.$$
That is, the mass $\Pi_V f$ puts on $U$ equals the mass $f$ has in the slab over $U$. Taking $U=V$ gives $\int_V\Pi_V f=\int_{\mathbb{R}^d}f$, so projecting just redistributes the total mass and doesn't change it.

Proposition: if $f\in L^2(\mathbb{R}^7)$, then for almost every $V\in\text{Gr}(1,7)$, $\Pi_V f$ is $C^2$.

Note that $L^2(\mathbb{R}^7)$ refers to the [Hilbert space](https://en.wikipedia.org/wiki/Hilbert_space) of all [square-integrable](https://en.wikipedia.org/wiki/Square-integrable_function) functions operating on a 7-dimensional real space. The intuition behind this proposition is that integrating peaks and valleys, will cancel out and things will get smooth as a result.

In the following image, interpret the red dots as peaks of $f$.
```figure
assets/figures/smoothing
```

## Connection with Fourier Transform

Consider $f:\mathbb{R}^d\to\mathbb{C}$, $\Pi_V f:V\to\mathbb{C}$, and their Fourier transforms $\hat f:\mathbb{R}^d\to\mathbb{C}$, $\widehat{\Pi_V f}:V\to\mathbb{C}$. 

Lemma: $\widehat{\Pi_V f}(\xi)=\hat f(\xi)$ for all $\xi\in V$.

Proof:
$$\widehat{\Pi_V f}(\xi)=\int_V\Pi_V f(y)\,e^{-i\xi\cdot y}\,dy=\int_V\int_{\Pi_V^{-1}(y)}f(x)\,d\text{vol}_F\,e^{-i\xi\cdot y}\,dy.$$
Since $x\in\Pi_V^{-1}(y)$, we have $x-y\perp V$, so for every $\xi\in V$, $(x-y)\cdot\xi=0$. Therefore,
$$\widehat{\Pi_V f}(\xi)=\int_V\int_{\Pi_V^{-1}(y)}f(x)\,e^{-i\xi\cdot x}\,d\text{vol}_F\,dy=\int_{\mathbb{R}^d}f(x)\,e^{-i\xi\cdot x}\,dx=\hat f(\xi).\qquad\square$$

## Projection Theory for unit balls, first steps

Let $X$ be a set of disjoint unit balls in $B_R\subset\mathbb{R}^2$. Here, let $|X| =$ the area of $X$ and $|\Pi_V X| =$ the length of $\Pi_V X$. Since $X\subset B_R$, rotating $V$ by an angle $\theta$ moves $\Pi_V X$ by at most $\approx R\theta$. So if $\text{angle}(V_1,V_2)\leq 1/R$, then $\Pi_{V_1}X$ and $\Pi_{V_2}X$ are $\approx$ the same at the scale of the balls.

Let $\mathbb{V}\subset\text{Gr}(1,2)$ be a set of $R$ evenly spaced lines, and let $E_S(X)=\{V\in\mathbb{V}:|\Pi_V X|\leq S\}$.

Question: if $X$ set of disjoint unit balls in $B_R\subset\mathbb{R}^2$, estimate $|E_S(X)|$ in terms of $S$ and $|X|$. And is it true that $|E_S(X)|\leq 1+\frac{S^2}{|X|}$? No.

Example: pack the balls densely into a ball $B_N\subset B_R$.

```figure
assets/figures/dense-balls
```
Then for all $V$, $|\Pi_V X|\sim N=|X|^{1/2}$. Taking $S=|X|^{1/2}$ gives $E_S(X)=\mathbb{V}$, so $|E_S(X)|\sim R$, while $1+\frac{S^2}{|X|}=2$.

The intuition underlying this is that balls don't behave like points in that they can be packed densely. The goal is to add hypotheses that the set of balls is "spread out" in order to achieve stronger conclusions.

## Cousin problem over finite fields

Let $\mathbb{F}_q$ be the finite field with $q$ elements, and $\mathbb{F}_p$ for $p$ prime. For $t\in\mathbb{F}_q$, define $\pi_t:\mathbb{F}_q^2\to\mathbb{F}_q$ by $\pi_t(x_1,x_2)=x_1+tx_2$. For $X\subset\mathbb{F}_q^2$, let
$$E_S(X)=\{t\in\mathbb{F}_q:|\pi_t(X)|\leq S\}.$$
Question: estimate $|E_S(X)|$ in terms of $S$, $|X|$, and $q$.

Conjecture: if $X\subset\mathbb{F}_p^2$ with $p$ prime, then $|E_S(X)|\lesssim 1+\frac{S^2}{|X|}$.

But this is not true in $\mathbb{F}_q^2$ if $q$ is not prime.

Example: let $q=p^2$, so $\mathbb{F}_p\subset\mathbb{F}_q$. Let $X=\mathbb{F}_p^2\subset\mathbb{F}_q^2$, so $|X|=p^2=q$. Notice that if $t\in\mathbb{F}_p$ and $(x_1,x_2)\in X$, then $\pi_t(x_1,x_2)=x_1+tx_2\in\mathbb{F}_p$. So for $t\in\mathbb{F}_p$, $\pi_t(X)\subset\mathbb{F}_p$ and $|\pi_t(X)|\leq p=q^{1/2}$. Thus $|E_p(X)|\geq p$, while $1+\frac{p^2}{|X|}=2$.

## Sum-product theory

Let $R$ be a ring and $A\subset R$. Define
$$\begin{aligned} A+A&:=\{a_1+a_2:a_1,a_2\in A\},\\
A\cdot A&:=\{a_1a_2:a_1,a_2\in A\}.\end{aligned}$$
Could it be the case that both $A+A$ and $A\cdot A$ are small?

Example: if $A\subset\mathbb{R}$ is generic, then $|A+A|,|A\cdot A|\sim|A|^2$. If $A$ is an arithmetic progression, $|A+A|\sim 2|A|$, and if $A$ is a geometric progression, $|A\cdot A|\sim 2|A|$.

Conjecture: if $A\subset\mathbb{R}$ is finite, then for every $\varepsilon>0$, $\max(|A+A|,|A\cdot A|)\geq c_\varepsilon|A|^{2-\varepsilon}$.

This type of problem is connected to projection theory.

Theorem (Elekes): if $A\subset\mathbb{R}$ is finite, then $\max(|A+A|,|A\cdot A|)\gtrsim|A|^{5/4}$. The proof uses Szemerédi–Trotter.

Theorem (Bourgain–Katz–Tao): if $p$ is prime, $A\subset\mathbb{F}_p$, and $|A|\leq p^{0.9}$, then $\max(|A+A|,|A\cdot A|)\gtrsim|A|^{1+\varepsilon}$ for some $\varepsilon>0$.
