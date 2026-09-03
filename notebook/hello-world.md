# hello world

This is the first note in my notebook. Notes are written in **Markdown** — each one is a `.md` file in the `notebook/` folder. The notebook holds two kinds of things:

- **one-off notes** — a single `.md` file, listed with just its date, name, and link (like this note)
- **topics** — a folder of related notes I keep coming back to, shown grouped under the topic name (like `reinforcement learning/` below). Topics start collapsed; click the topic name to reveal its notes in place, click again to fold it back up.

Everything is driven by one manifest file, `notebook/notes.json`. The list page always sorts newest to oldest by each entry's `date` — order in the file doesn't matter. A topic is ranked by its most recent note, and the notes inside a topic are sorted newest-first too.

## adding a one-off note

1. Create `notebook/my-note.md` and write in Markdown.
2. Add a line to `notebook/notes.json`:

```json
{ "slug": "my-note", "title": "my note", "date": "2026-08-29" }
```

The `slug` must match the filename (without `.md`); the note lives at `#notebook/my-note`.

## adding a note to an existing topic

1. Create the file inside the topic's folder, e.g. `notebook/rl/new-note.md`.
2. Add it to that topic's `notes` array in `notes.json`:

```json
{
    "topic": "rl",
    "title": "reinforcement learning",
    "notes": [
        { "slug": "new-note", "title": "new note", "date": "2026-08-29" },
        { "slug": "ppo", "title": "ppo", "date": "2026-08-29" }
    ]
}
```

Topic notes live at `#notebook/<topic>/<slug>`, e.g. `#notebook/rl/new-note`.

## creating a new topic

1. Make a folder for it: `notebook/my-topic/`.
2. Put the first note in it: `notebook/my-topic/first-note.md`.
3. Add a topic entry to `notes.json`:

```json
{
    "topic": "my-topic",
    "title": "my topic",
    "notes": [
        { "slug": "first-note", "title": "first note", "date": "2026-08-29" }
    ]
}
```

`topic` must match the folder name; `title` is what's displayed as the group heading.

## what works in notes

Inline `code`, [links](https://github.com/riensou), *emphasis*, images, and:

> blockquotes, for quoting things

```python
def hello():
    print("world")
```

## math

Inline math like $e^{i\pi} + 1 = 0$ or $x_1, \dots, x_n$ uses single dollar signs, and display math uses double:

$$\nabla_\theta J(\theta) = \mathbb{E}_{\tau \sim \pi_\theta}\left[\sum_{t=0}^{T} \nabla_\theta \log \pi_\theta(a_t \mid s_t) \, R(\tau)\right]$$

A literal dollar sign in prose should be escaped as `\$` so it isn't treated as math.
