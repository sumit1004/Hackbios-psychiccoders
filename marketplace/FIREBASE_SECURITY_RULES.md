# Firebase Security Rules for Marketplace

## Exporter Firebase Database Rules

Copy these rules to your **Exporter Firebase Console** > **Realtime Database** > **Rules** tab:

```json
{
  "rules": {
    "productCatalog": {
      ".read": true,
      ".write": "auth != null"
    },
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid",
        "cart": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        },
        "products": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        },
        "profile": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        },
        "documents": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        },
        "ekyc": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        },
        "videoCallRequests": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        },
        "summary": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        },
        "shipments": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        },
        "payments": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        },
        "disputes": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        },
        "support": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        },
        "orders": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        },
        "notifications": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        }
      }
    },
    "supportStatus": {
      "admin": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "supportChat": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

## Importer Firebase Database Rules

Copy these rules to your **Importer Firebase Console** > **Realtime Database** > **Rules** tab:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid",
        "cart": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        },
        "profile": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        },
        "documents": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        },
        "ekyc": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        },
        "videoCallRequests": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        },
        "summary": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        },
        "shipments": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        },
        "payments": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        },
        "disputes": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        },
        "support": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        },
        "orders": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        },
        "notifications": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        }
      }
    },
    "supportStatus": {
      "admin": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "supportChat": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

## Important Notes

1. **productCatalog** has `.read: true` to allow anyone (including unauthenticated users) to browse products in the marketplace.

2. **Cart access** requires authentication - users can only read/write their own cart at `users/{uid}/cart`.

3. After updating the rules, click **Publish** in Firebase Console.

4. The rules will take effect immediately after publishing.

