# Forecasting the future by minimizing errors in the past

Motivating forecasting without invoking probability theory directly.

## Algebraic Perspective

Suppose we have some list of outcomes $y_1,\ldots,y_N$ and predictions $p_1,\ldots, p_N$. What is the goal of forecasting? Here, we define it to be the minimization of some loss (this step is arbitrary, as minimizing and maximizing is equivalent).
$$\mathcal{L}(\{p, y\})=\frac{1}{N}\sum_{i=1}^N\text{loss}(p_i,y_i)$$
Here, we haven't made any statements about $\text{loss}(p,y))$. Examples include
- $\text{loss}(p,y)=(p-y)^2$
- $\text{loss}(p,y)=\mathbb{1}\{p\neq y\}$ for $p,y\in\{0,1\}$
- $\text{loss}(p,y)=|p-y|$

For these loss functions, and ones we study today, if $p=y$, then $\mathcal{L}(\{p,y\})=0$.

If we know the outcomes $y_i$ already, then what are best choices for predictions $p_i$? Simply choose $p_i=y_i$.

Suppose we know the outcomes $y_i$ already, but we are restricted to choosing one $p$ for our predictions. What is the optimal choice?

Let $y_i\in\{0,1\}$. Then 
$$
\begin{align*}
\frac{1}{N}\sum_{i=1}^N\text{loss}(p_i,y_i) & = \frac{1}{N}\sum_{i=1}^N y_i\text{loss}(p_i,1) + (1-y_i)\text{loss}(p_i,0) \\
& = \hat\mu_y\text{loss}(p,1)+(1-\hat\mu_y)\text{loss}(p,0) 
\end{align*}
$$
where $\hat\mu_y=\frac{1}{N}\sum_{i=1}^Ny_i$, the rate of outcomes. Since we decided the goal of forecasting is to minimize the loss, this implies that 
$$
\begin{align*}
p_\text{optimal} & =\arg\min_p \hat\mu_y\text{loss}(p,1)+(1-\hat\mu_y)\text{loss}(p,0) \\
& = \Phi(\hat\mu_y)
\end{align*}
$$
where $\Phi$ is a function of $\hat\mu_y$. In the case of $\text{loss}(p,y)=(p-y)^2$, it is easy to solve for the value of $\Phi(\hat\mu_y)$. Differentiate $\mathcal{L}(\{p,y\})$ w.r.t. $p$ and solve for $p$ when the derivative equals $0$.
$$\frac{d\mathcal{L}}{dp}=2\left(\hat\mu_y(p-1)+(1-\hat\mu_y)p\right)=2(p-\hat\mu_y)$$
$$\frac{d\mathcal{L}}{dp}=0\implies p=\hat\mu_y$$
This tells us that for the case where we score according to $\text{loss}(p,y)=(p-y)^2$, it is optimal to predict that average outcome in order ot minimize loss.

Suppose that paired with each outcome $y_i$, we have it paired with some *features* $x_i$. We can reformulate our setup as 

$$
\begin{align*}
\mathcal{L}(\{p(x),y\}) & = \frac{1}{N}\sum_{i=1}^N \text{loss}(p(x_i), y_i) \\
& = \sum_{x\in\mathcal{X}} \frac{n_x}{N} \left\{\frac{1}{n_x}\sum_{\{i:x_i=x\}}\text{loss}(p(x),y_i)\right\}
\end{align*}
$$
By our earlier derivation, this implies that $p(x)=\Phi\left(\frac{1}{n_x}\sum_{\{i:x_i=x\}}y_i\right)=\Phi(\hat\mu_{y|x})$.

## Geometric Perspective

Next, we investigate this from a geometric perspective. Let $\vec y\in\{0,1\}^N$, so $\vec y$ is a corner on the $N-$hypercube. Notice that 
$$\frac{1}{N}\sum_{i=1}^N(p(x_i)-y_i)^2=\frac{1}{N}\|\vec{p}(\vec x)-\vec{y}\|_2^2$$
Let $\mathcal{Y}$ be the set of all realizable $y$-vectors, and $\Pi_\mathcal{Y}$ be the Euclidean projection onto the convex hull of $\mathcal{Y}$.

Recall that the convex hull of vectors $v_1,\ldots,v_n$ is the set $\left\{z=\sum_{i}q_iv_i\mid q_i\geq0,\sum_i q_i=1\right\}$.

The following fact is easily provable (though we omit it here): $\|p-y\|^2\geq\|\Pi_\mathcal{Y}(p)-y\|^2+\|\Pi_\mathcal{Y}(p)-p\|^2$. This fact implies that in order to optimize your prediction, it must lie *inside* the convex hull. Thus, we were able to get some notion of $\sum_i q_i=1$ without invoking probability theory axioms, but rather through the goal of optimizing a loss and the definition of a convex hull.

This derivation also works for any proper scoring rule (though we also omit this here).
