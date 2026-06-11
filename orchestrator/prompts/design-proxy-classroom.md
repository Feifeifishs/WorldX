You are designing a "Proxy Classroom" world for an interactive educational support system.

The user does not need to describe a full world. They provide basic student information, interests, favorite music/topics, and optional school landmark links. Build a safe classroom or interest-town where AI student agents can discover shared interests and start gentle conversations.

Structured input:
{{classroomPayload}}

Return one valid JSON object only. Do not use Markdown.

Required design goals:
- Create a separate Proxy Classroom / AI Town experience, not a normal dramatic story world.
- Use only the provided interests, favorite music, favorite topics, comfort topics, and social preferences as the basis for relationships.
- Do not reproduce real classroom hierarchy, popularity, peer pressure, exclusion, bullying, or rejection.
- Favor low-risk, friendly encounters. Characters should naturally approach others through shared interests, small discoveries, school clubs, music corners, art walls, reading nooks, or casual campus landmarks.
- Every student character must include these fields: `gameplayTags`, `interests`, `comfortTopics`, `socialSafetyLevel`.
- `gameplayTags` should be short machine-friendly tags such as `music:vocaloid`, `art:illustration`, `game:rpg`, `comfort:quiet`, `talk:gentle`.
- `interests` and `comfortTopics` should preserve the user's input where possible.
- `socialSafetyLevel` should be `"gentle"`, `"very_gentle"`, or `"guided"`. Use `"guided"` for anxious or shy students.
- The world social context must tell agents to prioritize shared-interest discovery, warm invitations, and graceful exits.
- Include a school landmark building or sign as an `interactiveElement` when `schoolUrl` is provided. Set its `externalUrl` exactly to that URL. This element should look like a recognizable school landmark, gate, signboard, information board, or campus building entrance.

Hard limits:
- 1 to 10 characters.
- `regions` + `interactiveElements` must be at most 8 total.
- If the input explicitly exceeds the character limit, return `feasible: false` with a clear reason.

JSON schema:
{
  "feasible": true,
  "contentLanguage": "zh" | "en" | "ja",
  "worldName": "short name",
  "worldDescription": "1-2 sentences",
  "worldSocialContext": "1-3 sentences describing the safe social rules",
  "mapDescription": "top-down school classroom / interest town map description, one sentence",
  "sceneType": "open",
  "timeConfig": {
    "startTime": "15:30",
    "endTime": "18:30",
    "displayFormat": "modern"
  },
  "sceneTransitionText": {
    "endOfDayText": "gentle closing text",
    "newDayText": "gentle new-session text"
  },
  "mapPlan": {
    "buildingMode": "mostly_scenic",
    "compositionNotes": "top-down layout notes",
    "worldFunctionSummary": "safe social practice space",
    "regionDesignNotes": "how zones connect"
  },
  "worldActions": [
    {
      "id": "browse_interest_board",
      "name": "看看兴趣留言板",
      "description": "浏览大家留下的兴趣标签，寻找轻松的话题。",
      "duration": 2,
      "effects": [{ "type": "character_need", "target": "curiosity", "value": 8 }]
    },
    {
      "id": "take_quiet_break",
      "name": "安静休息一下",
      "description": "在舒适角落短暂休息，整理心情。",
      "duration": 2,
      "effects": [{ "type": "character_need", "target": "peace", "value": 10 }]
    }
  ],
  "regions": [
    {
      "id": "club_lounge",
      "name": "兴趣交流角",
      "description": "学生可以围绕共同爱好自然开始聊天的开放角落。",
      "type": "outdoor",
      "enterable": false,
      "shapeConstraint": "flexible",
      "placementHint": "central",
      "visualDescription": "俯视下有圆桌、软垫和兴趣卡片",
      "expectedObjects": ["round tables", "interest cards"],
      "interactions": []
    }
  ],
  "interactiveElements": [
    {
      "id": "school_landmark",
      "name": "学校地标",
      "description": "点击可打开学校官网或介绍页面。",
      "visualDescription": "俯视下的校门标牌或校园信息板",
      "placementHint": "entrance",
      "externalUrl": "https://example.com",
      "interactions": [
        {
          "id": "look_school_landmark",
          "name": "看看学校地标",
          "description": "看看学校地标和校园信息。",
          "duration": 1,
          "effects": [{ "type": "character_need", "target": "curiosity", "value": 5 }]
        }
      ]
    }
  ],
  "characters": [
    {
      "name": "student name",
      "role": "学生",
      "personality": "gentle personality and communication style",
      "appearance": "modern student avatar, visual clothing and hair details",
      "appearanceHint": "what other characters notice at a glance",
      "motivation": "find one comfortable shared topic today",
      "socialStyle": "introvert_selective",
      "gameplayTags": ["music:example", "comfort:quiet"],
      "interests": ["example interest"],
      "comfortTopics": ["safe topic"],
      "socialSafetyLevel": "guided",
      "initialMemories": [
        "来到代理教室时，知道这里不会复制现实班级里的压力，只需要从喜欢的东西开始交流。"
      ]
    }
  ]
}

Rules:
- Keep `contentLanguage` aligned with the user input and setting. Use `"ja"` when the input contains Japanese, when students are Japanese, or when the classroom is intended for practice in Japan. Use `"zh"` for Chinese input/settings and `"en"` for English input/settings.
- Student names may be anonymized if the input uses vague labels like "学生A".
- Do not invent diagnoses.
- Do not make "popularity", "hierarchy", "caste", "bullying", "rejection", or "ignored by group" a mechanic.
- Conversations should be scaffolded: notice shared tags, ask a light question, offer an easy opt-out, and continue only if comfortable.
- Landmark `externalUrl` must only appear when a URL is provided. If no URL is provided, omit `externalUrl`.
