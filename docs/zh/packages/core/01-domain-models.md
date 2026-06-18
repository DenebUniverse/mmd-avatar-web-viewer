# 领域模型

## CharacterRef

```ts
interface CharacterRef {
  id: CharacterId
  name: string
}
```

## Actor

```ts
interface Actor {
  id: ActorId
  characterId: CharacterId
  slotId: string
  status: 'loading' | 'ready' | 'error' | 'disposed'
}
```

## Session

```ts
interface Session {
  id: SessionId
  title: string
  characterId: CharacterId
  providerId?: ProviderId
  providerSessionId?: string
  status: 'draft' | 'idle' | 'running' | 'archived' | 'error'
}
```

## ActorBinding

```ts
interface ActorBinding {
  actorId: ActorId
  sessionId: SessionId
  characterId: CharacterId
  boundAt: string
}
```

Binding 只在发送消息时建立，不在选择角色时建立。
