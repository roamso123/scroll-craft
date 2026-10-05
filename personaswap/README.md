# personaswap

Batch persona replacement over footage **you hold the rights to**, using the
[kie.ai](https://kie.ai) unified jobs API.

Point it at a folder of your own clips, give it one synthetic persona and one
sentence describing what should change, and it swaps every clip, resumably,
with an audit trail beside each output.

```bash
personaswap ingest local --release ROSTER-2026-01
personaswap run --persona aurora --changes "golden hour rooftop, navy slip dress"
```

That is the whole operating loop. Your two inputs are the persona and the
changes; everything else — uploads, queueing, polling, retries, download,
provenance — is handled.

---

## What it does and does not do

**Does:** ingest from a local folder, or from the Instagram Graph API for an
account you hold a token for. Queue one job per clip. Submit to a kie.ai model,
poll to completion, download, tag the output as synthetic, and write a sidecar
recording exactly how it was made.

**Does not:** scrape Instagram. There is no scraper and adding one is not a
small change — the ingest path is deliberately limited to files you supply and
to the Graph API, which only ever returns media for an account you are
authenticated against. Pulling an arbitrary public page would be a
terms-of-service breach and a rights problem, and it is not what working your
own roster requires.

---

## Install

Python 3.11+. No dependencies. `ffmpeg`/`ffprobe` on PATH are optional but
recommended — without them you lose duration probing and metadata tagging.

```bash
pip install -e .          # or just run: python3 -m personaswap.cli
export KIE_AI_API_KEY=...  # or put it in a .env beside the config
```

## Setup

```bash
personaswap init .
```

That writes `personaswap.toml`. Three things to fill in.

### 1. The model id

kie.ai's market catalogue moves, and **this is the one value no default can
guess.** Read the id off the model's page in the kie.ai dashboard, or try
`personaswap models`, then set it:

```toml
[swap]
model = "vendor/model-id"
```

If the model names its inputs differently, say so rather than editing code:

```toml
[swap.fields]
video  = "input_video"      # the driving clip
face   = "identity_image"   # the persona reference still
prompt = "instruction"

[swap.extra]                # anything else the model requires, passed verbatim
fidelity = 0.8
```

This mapping is why swapping models later is a config edit, not a rewrite.

### 2. A persona

The synthetic identity you are swapping *to*. `face` is your generated
reference still; `look` is appended to every prompt so a batch stays
recognisably one person.

```toml
[personas.aurora]
face      = "personas/aurora/face.png"
look      = "warm olive skin, dark wavy hair, mid-20s, soft jawline"
synthetic = true
```

### 3. A release

```toml
[releases.ROSTER-2026-01]
talent                      = "Talent Name"
signed                      = "2026-01-04"
expires                     = "2027-01-04"
covers_synthetic_alteration = true
```

`covers_synthetic_alteration` is a hard gate: the pipeline refuses to queue or
process a clip whose release does not set it, and refuses one whose release has
expired. A standard capture-and-distribute release frequently does **not** grant
synthetic alteration of the performer's likeness — it is usually a separate
clause. Check the signed document before setting this true. The release id is
recorded in every output's sidecar, so months later you can answer "what
authorised this file" from the file itself.

---

## Commands

| Command | What it does |
|---|---|
| `init [dir]` | Write a starter config and folders |
| `probe` | Check key, credit balance, model, personas, missing face files |
| `models` | Try to list model ids from the API |
| `ingest local --release ID [--path DIR]` | Register a folder of clips |
| `ingest graph --release ID --token T [--limit N]` | Pull video from an account you manage |
| `run --persona NAME [--changes ...]` | Swap every registered clip |
| `status [-v]` | Ledger summary, per-clip detail with `-v` |
| `retry` | Re-run failed jobs with a fresh retry budget |

### Describing the changes

`--changes` is free text. The three labelled flags are the same thing with
structure, for when you want one axis pinned across a batch:

```bash
personaswap run --persona aurora \
  --outfit "charcoal tailored blazer, no jewellery" \
  --background "sunlit loft, shallow depth of field" \
  --body "slightly taller frame" \
  --changes "cooler grade, late afternoon"
```

Every prompt also carries a motion lock (preserve original motion, timing,
framing, camera; no added cuts), a quality floor, a negative prompt targeting
identity drift and flicker, and your `[style].base` house look. Check the
composed prompt before spending credits:

```bash
personaswap run --persona aurora --changes "..." --dry-run
```

---

## How reruns behave

A job is identified by `(clip content hash, persona, prompt, model)`. Rerunning
the same command re-queues nothing and re-bills nothing. Change the prompt and
it is a new job; re-encode a clip and it is a new clip.

Interrupt a run and rerun it: clips already submitted resume by polling their
existing task id rather than paying for a second submission. Failures are
isolated per clip — one bad clip never takes the batch down — and `retry`
picks them up.

Concurrency is `[run].concurrency` (default 2). Raise it once you know your
account's rate limit.

## Provenance

Each output gets `<name>.mp4.json` recording the source filename and SHA-256,
the persona, the full prompt, the model, the kie.ai task id, and the release
that authorised it. With ffmpeg present, a synthetic-content note is also
written into the container metadata, so the marker survives losing the sidecar.

This is not C2PA signing. If you need cryptographically verifiable provenance,
feed the sidecar's assertions to a C2PA signer as a later step. Several
platforms now require a synthetic-media label on this kind of output; the
sidecar gives you what you need to apply one.

## Cost

Every clip is a paid generation. `probe` prints your credit balance, and
`--dry-run` tells you how many clips a command would submit before it submits
them. Start with `--limit 1` on a new model or a new prompt.

## Testing

```bash
python3 tests/smoke.py
```

37 checks across config, the rights gate, ingest, prompt assembly, field
mapping, ledger idempotency, resume and provenance, with the network layer
stubbed — no API key or credits needed.

## Layout

```
personaswap/
  kie.py          kie.ai client: upload, createTask, recordInfo, download
  config.py       TOML config, personas, releases
  rights.py       release checks
  ingest.py       local folder + Instagram Graph API
  prompts.py      prompt assembly and model field mapping
  pipeline.py     queue, thread pool, resume, retry
  provenance.py   sidecar + container tagging
  cli.py          command line
```
