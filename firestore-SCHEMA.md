# Firestore Schema (Phase 1 Notifications)

## users/{uid}
- **name**: string
- **email**: string
- **dogProfileId**: string | null
- **notificationSettings**: {
  - **enabled**: boolean
  - **preferences**: {
    - **notifyOnFriendCheckin**: boolean
    - **notifyOnFriendEvent**: boolean
  }
}

### Subcollections
- **friends/{friendUid}**: {
  - **friendUid**: string
  - **email**: string
  - **name**: string
  - **createdAt**: number (ms)
}
- **notificationTokens/{token}**: {
  - **token**: string
  - **platform**: 'ios'|'android'|'web'
  - **createdAt**: number
  - **updatedAt**: number
  - **enabled**: boolean
}

## checkins/{checkinId}
- existing fields + **checkedOutAt**: number | null

## events/{eventId}
- **eventId**: string
- **creatorUid**: string
- **parkId**: string
- **parkName**: string
- **title**: string
- **scheduledAt**: number
- **createdAt**: number
