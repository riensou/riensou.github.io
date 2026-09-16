Based on this [video](https://www.youtube.com/watch?v=zL1kLftVTlo) about continual learning.

# On-Policy Self-Distillation

Ronak Malde from [Trajectory](https://www.trajectory.ai/) proposes the following chart as a way of explaining methods we have used for adapting foundation models to better serve our needs:

| Method | Task dist. | Sampling | Parallelism<sup>1</sup> | Reward |
|---|---|---|---|---|
| SFT | Offline | None | None | Per-token |
| DPO | Online | Off-policy | Pairs | Sequence-level |
| PPO | Online | On-policy | Single | Sequence-level |
| GRPO | Offline | On-policy | Group x N | Sequence-level |
| OPSD | Online | On-policy | Single | Dense |

## SFT

Collect a "preferable" dataset of demonstrations $(x,y)$ with prompts $x$ and responses $y$. Maximize the likelihood of this dataset with token-level cross entropy. 
$$ \mathcal{L}_\text{SFT}(\theta)=-\mathbb{E}_{(x,y)\sim\mathcal{D}}\left[\sum_t \log\pi_\theta(y_t\mid x, y_{< t})\right]$$
There is nothing fundamentally mechanically different about [Supervised Fine-Tuning](https://arxiv.org/abs/2203.02155) (SFT) compared to pretraining other than the idea that a prompt can be included and the loss on the prompt tokens can be masked out.

## DPO

The RLHF objective can be posed as 
$$\mathcal{L}_\text{RLHF}(\theta)= -\mathbb{E}_{x\sim\mathcal{D}}\big[ \mathbb{E}_{y\sim\pi_\theta(\cdot \mid x)}\left[r(x,y)\right] - \beta\mathrm{KL}\left(\pi_\theta(\cdot \mid x) \mid\mid \pi_\text{ref}(\cdot \mid x)\right)\big].$$

It is theoretically known that $\pi^* (y\mid x)\propto\pi_\text{ref}(y\mid x)\cdot \exp\left({r(x,y) / \beta}\right)$. Hidden in the proportionality, we have
$$\pi^* (y\mid x) = \frac{\pi_\text{ref}(y\mid x)\cdot \exp\left({r(x,y) / \beta}\right)}{\sum_y \pi_\text{ref}(y\mid x)\cdot\exp\left(r(x,y) / \beta\right)}.$$
Let $Z(x)= \sum_y \pi_\text{ref}(y\mid x)\cdot\exp\left(r(x,y) / \beta\right)$. Then manipulating with algebra, we have
$$r(x,y)=\beta\log\left(\pi^* (y\mid x) / \pi_\text{ref}(y\mid x)\right)+\beta\log(Z(x)).$$
Note that calculating $Z(x)$ is intractable as it requires summing over all possible responses $y$ to a prompt $x$. This motivates learning via the differences of rewards for a given prompt, as the intractable term cancels out.

The [Bradley-Terry model](https://en.wikipedia.org/wiki/Bradley%E2%80%93Terry_model) (1952) gives us that (given some assumptions) $P(y^+\succ y^-\mid x)=\sigma\left(r(x,y^+)-r(x,y^-)\right)$. In order to solve the RLHF objective, it turns out to be equivalent to (1) fit a reward model $r_\varphi$ by MLE under Bradley-Terry and then (2) solve the KL-constrained objective against $r_\varphi$. The idea behind [Direct Preference Optimization](https://arxiv.org/abs/2305.18290) (DPO) is to notice that since each policy implicitly defines a reward and every reward equivalence class is represented by one policy, we can perform (1) in policy space rather than reward space. Then, (2) will already be solved<sup>2</sup>.

$$ \mathcal{L}_\text{DPO}(\theta)=-\mathbb{E}_{(x,y^+,y^-)\sim\mathcal{D}}\big[\log P(y^+\succ y^-\mid x) \big]$$
$$ =-\mathbb{E}_{(x,y^+,y^-)\sim\mathcal{D}}\big[\log\sigma\left(\beta\cdot\log\left(\pi_\theta(y^+\mid x)/\pi_\text{ref}(y^+\mid x)\right)-\beta\cdot\log\left(\pi_\theta(y^-\mid x)/\pi_\text{ref}(y^-\mid x)\right)\right)\big]$$

## PPO

[Proximal Policy Optimization](https://arxiv.org/abs/1707.06347) (PPO) is a general Reinforcement Learning algorithm developed by [OpenAI](https://openai.com/) that was first used in contexts other than adapting foundation models. 

Following the basic idea of [Policy Gradients](https://proceedings.neurips.cc/paper_files/paper/1999/file/464d828b85b0bed98e80ade0a5c43b0f-Paper.pdf), we know that the update is $\propto \log\pi_\theta(y\mid x)\cdot A$, where $A$ is the *advantage*<sup>3</sup>. 
- $A>0$: $y$ associated with a good outcome, so increase its probability
- $A<0$: $y$ associated with a bad outcome, so decrease its probability

As we update a model, we have to keep in mind that we are searching for a $\pi_\theta$ based on samples from a different model, we call $\pi_\text{old}$. To reuse the old samples, we compare the new and old probabilities:
$$\frac{\pi_\theta(y\mid x)}{\pi_\text{old}(y\mid x)}\begin{cases}
=1 & \text{the probability did not change} \\
>1 & \text{$y$ is more likely with the new model} \\
<1 & \text{$y$ is less likely with the new model}
\end{cases}.$$

Using this ratio, the surrogate objective is 
$$\mathcal{L}_\text{surrogate}(\theta)=-\mathbb{E}_{(x,y)\sim \pi_\text{old}(y\mid x)}\left[\frac{\pi_\theta(y\mid x)}{\pi_\text{old}(y\mid x)}\cdot A\right].$$
In practice, this doesn't work because we might end up changing the probabilites too much. The key insight of PPO is to restrict the ratio to a small interval around $1$, thus yielding 
$$\mathcal{L}_\text{PPO}(\theta)=-\mathbb{E}_{(x,y)\sim\pi_\text{old}(y\mid x)}\left[\min\left(\frac{\pi_\theta(y\mid x)}{\pi_\text{old}(y\mid x)}\cdot A, \text{clip}\left(\frac{\pi_\theta(y\mid x)}{\pi_\text{old}(y\mid x)}, 1-\varepsilon, 1+\varepsilon\right)\cdot A\right)\right].$$

## GRPO

[Group Relative Policy Optimization](https://arxiv.org/abs/2402.03300) (GRPO) is a variant of PPO developed by [DeepSeek](https://www.deepseek.com/) that works with multiple samples per prompt and without needing to train a value function.

For each prompt $x$, generate $N$ responses $y_1,\ldots,y_N\sim\pi_\theta(y\mid x)$. Produce reward $R_i$ for each response and use these rewards to generate advantages for each response according to
$$A_i=\frac{R_i-\text{mean}(R_1,\ldots,R_N)}{\text{std}(R_1,\ldots,R_N)}.$$
This yields the loss:
$$\mathcal{L}_\text{GRPO}(\theta)=-\mathbb{E}_{(x,y_i)\sim\pi_\text{old}(y\mid x)}\left[\frac{1}{N}\sum_{i=1}^N\min\left(\frac{\pi_\theta(y_i\mid x)}{\pi_\text{old}(y_i\mid x)}\cdot A_i, \text{clip}\left(\frac{\pi_\theta(y_i\mid x)}{\pi_\text{old}(y_i\mid x)}, 1-\varepsilon, 1+\varepsilon\right)\cdot A_i\right)-\beta\mathrm{KL}\left(\pi_\theta(\cdot\mid x)\mid\mid\pi_\text{ref}(\cdot\mid x)\right)\right].$$

## OPSD

[On-Policy Distillation](https://thinkingmachines.ai/blog/on-policy-distillation/) replaces the scalar reward with a teacher's token-level judgement. [On-Policy Self-Distillation](https://arxiv.org/abs/2601.18734) (OPSD) is the case where the teacher is the model itself, given privileged context $c$ that the student does not see<sup>4</sup>. This context could take the form of a demonstration, the answer, feedback, etc. 

Write $\pi_T$ for the model given $c$ and $\pi_S$ for the model without it. For each prompt $x$, generate a single response $y\sim\pi_S(y\mid x)$. Instead of querying some reward oracle for a scalar value for $y$ given $x$, we can ask the teacher what it would have done at each step of the student's own response, and use the difference in log probabilities as the advantage:
$$\hat{A}_t=\log\pi_T(y_t\mid x, c, y_{< t})-\log\pi_S(y_t\mid x, y_{< t}).$$ 
This is the same comparison as the PPO ratio, but between two models rather than two versions of one model, and read at each token rather than over the whole response.
- $\hat{A}_t>0$: the teacher finds $y_t$ more likely than the student did, so increase its probability
- $\hat{A}_t<0$: the teacher finds $y_t$ less likely than the student did, so decrease its probability
- $\hat{A}_t\approx 0$: the context $c$ did not change what the model would write here, so there is nothing to learn

Note that the reward now lands on the token that caused a mistake, rather than on all of them equally as it does under $A_i$ in GRPO. We also never have to wait for $y$ to finish, since a token can be scored as soon as it is written.

The objective is otherwise unchanged:
$$\mathcal{L}_\text{OPSD}(\theta)=-\mathbb{E}_{(x,y)\sim\pi_S(y\mid x)}\left[\sum_t\min\left(\frac{\pi_\theta(y_t\mid x, y_{<t})}{\pi_S(y_t\mid x, y_{<t})}\cdot\hat{A}_t, \text{clip}\left(\frac{\pi_\theta(y_t\mid x, y_{<t})}{\pi_S(y_t\mid x, y_{<t})}, 1-\varepsilon, 1+\varepsilon\right)\cdot\hat{A}_t\right)\right].$$

## Footnotes

<p id="parallelism"><sup>1</sup> Note that the parallelism column refers to how many model responses per prompt the training signal needs, not how the algorithms themselves can be run once the data is collected.</p>

<p id="fn-condition"><sup>2</sup> This isssuming that $\pi^* $ is attainable and that MLE reaches its optimum.</p> 

<p id="fn-advantage"><sup>3</sup> This can be thought of as how much better or worse an action was than expected. A common estimate is $\hat{A}_t=G_t-V(s_t)$ where $G_t$ is the observed return from $t$ onward and $V(s_t)$ is the value function's predicted return from state $s_t$.</p>

<p id="fn-privileged"><sup>4</sup> Both $\pi_T$ and $\pi_S$ are the same weights; only the conditioning differs. Without $c$ they would be identical and every $\hat{A}_t$ would be zero — the gap between what the teacher sees and what the student sees is the entire training signal.</p>


