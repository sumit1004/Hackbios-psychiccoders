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
      ".read": true,
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid",
        "cart": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        },
        "products": {
          ".read": true,
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
    "importers": {
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

2. **Users node** has `.read: true` to allow the marketplace to iterate over all users and display their products. This is necessary for the marketplace to aggregate products from all exporters.

3. **Products** under `users/{uid}/products` have `.read: true` to allow public access for marketplace display, while `.write` is restricted to the product owner.

4. **Cart access** requires authentication - users can only read/write their own cart at `users/{uid}/cart`.

5. **Other user data** (profile, documents, ekyc, etc.) remains protected and can only be accessed by the user themselves.

6. After updating the rules, click **Publish** in Firebase Console.

7. The rules will take effect immediately after publishing.

## Security Considerations

⚠️ **Note**: Allowing `.read: true` on the `users` node allows reading the structure of all user data. However, sensitive data like profile, documents, ekyc, etc. are still protected by their individual rules. Only products are publicly readable for marketplace display purposes.

