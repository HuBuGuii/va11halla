# Core Event Extractor

This spec defines how long chat history is compressed into durable memory records.

## Goal

Convert raw chat messages into:

1. a concise summary for future context
2. a list of structured core events
3. a removable source message set

The extractor must optimize for long-term usefulness, not message fidelity.

## Input

```json
{
  "sessionId": "string",
  "sessionType": "private",
  "systemText": "string",
  "messages": [
    {
      "id": "string",
      "role": "user",
      "content": "string",
      "created_at": 0,
      "extra": {}
    }
  ]
}
```

## Output

```json
{
  "summary_text": "string",
  "events": [
    {
      "type": "goal",
      "title": "string",
      "summary": "string",
      "keywords": ["string"],
      "participants": ["user", "assistant"],
      "importance": 0.8,
      "confidence": 0.8,
      "sourceMessageIds": ["m1", "m2"],
      "timeStart": 0,
      "timeEnd": 0
    }
  ],
  "source_message_ids": ["m1", "m2"],
  "interest_tags": ["game", "movie"],
  "style_tags": ["gentle"],
  "social_tags": ["open_to_chat"],
  "persona_signals": ["string"],
  "emotion_signals": [
    {
      "name": "curiosity",
      "score": 0.8,
      "polarity": "positive"
    }
  ],
  "tags": ["game", "movie"]
}
```

## Fixed Tag Sets

Use only these tag enums for the demo project.

### interest_tags

- `life`
- `study`
- `work`
- `game`
- `movie`
- `music`
- `anime`
- `food`
- `travel`
- `pet`
- `fitness`
- `fashion`
- `technology`
- `art`
- `relationship`
- `emotion`

### style_tags

- `gentle`
- `playful`
- `serious`
- `rational`
- `expressive`
- `introverted`
- `outgoing`

### social_tags

- `wants_companionship`
- `open_to_chat`
- `prefers_gentle_tone`
- `prefers_humor`
- `shares_interests`
- `emotionally_expressive`

### emotion_signals.name

- `joy`
- `calm`
- `curiosity`
- `stress`
- `anxiety`
- `sadness`
- `loneliness`
- `excitement`

## Allowed Event Types

- `goal`
  User objective, task, plan, or problem to solve.
- `preference`
  Stable likes, dislikes, habits, aesthetic choices, or behavioral tendencies.
- `fact`
  Durable factual information worth remembering in future turns.
- `decision`
  A choice, conclusion, commitment, or accepted plan.
- `emotion`
  Meaningful emotional state that affects future interaction.
- `relationship_signal`
  Social preference, compatibility signal, or public recommendation clue.

## Tagging Guidance

- `tags` should be a compact union of the most important interest tags
- `interest_tags` should prefer stable, broad categories over niche labels
- `style_tags` should reflect communication style or interaction preference
- `social_tags` should reflect companionship, openness, and social compatibility
- `emotion_signals` should capture the dominant emotional state in a structured way

## What Counts As A Core Event

Keep an event if at least one is true:

- it changes what the assistant should remember later
- it reveals user preference or profile information
- it records a meaningful conclusion or plan
- it captures a stable fact, constraint, or identity signal
- it contains file or image analysis results likely to matter later

## What Must Be Dropped

Do not preserve these as events:

- greetings and farewells
- politeness-only turns
- repeated confirmations
- low-information filler
- duplicate restatements already covered by a later event
- assistant wording that adds style but no durable information

## Segmentation Rules

Do not segment by role.

Segment by semantic closure:

- a user raises a topic, need, or question
- the assistant responds or analyzes
- the user confirms, rejects, or refines
- a conclusion or durable state is formed

One event may contain multiple user and assistant messages.

## Compression Rules

- prefer fewer, stronger events over many weak ones
- combine repeated turns about the same topic into one event
- preserve facts and outcomes, not stylistic phrasing
- when two events conflict, prefer the newer one
- use `summary_text` to describe the compressed portion as a whole

## Private/Public Guidance

- `private`
  Focus on continuity, goals, facts, and preferences needed for future chat.
- `public`
  Use the same extraction rules, but prefer more explicit tags and relationship signals.

The extraction logic is the same. Public mode only adds downstream tagging and recommendation use.

## Scoring Guidance

- `importance`
  How valuable the event is for future dialogue or profile construction.
- `confidence`
  How certain the extractor is that the event is correctly inferred.

Both scores must be between `0` and `1`.

## Output Constraints

- output valid JSON only
- event `type` must be from the allowed enum
- `keywords`, `persona_signals`, and `tags` must be short arrays of compact strings
- `interest_tags`, `style_tags`, and `social_tags` must use only the fixed enums above
- `emotion_signals[].name` must use only the fixed enum above
- `sourceMessageIds` must map only to input message ids
- `summary_text` should be concise and non-redundant

## Preferred Reasoning Pattern

1. remove noise
2. group messages into semantic units
3. identify durable information in each unit
4. convert each unit into one core event when possible
5. merge duplicate events
6. output one compressed memory record
