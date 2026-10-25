# How to Add a New Dashboard Page

Follow these steps to create and register a new page in the **SEO GPS** React frontend:

---

## Step 1: Create the Page Component

Create a new file in `frontend/src/pages/YourNewPage.tsx`:

```tsx
import React from 'react';
import { useI18n } from '../i18n';

export const YourNewPage: React.FC = () => {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <h1 className="text-title-xl font-extrabold text-ink tracking-tight">
        Your New Page Title
      </h1>
      <div className="editorial-card p-6">
        <p className="text-body-md text-ink">Page content goes here...</p>
      </div>
    </div>
  );
};
```

---

## Step 2: Add Navigation Link in `Sidebar.tsx`

In `frontend/src/components/Sidebar.tsx`, add your page to the `navItems` list:

```tsx
{ id: 'your_page', label: t('nav.your_page'), icon: YourIcon },
```

---

## Step 3: Add Routing in `App.tsx`

In `frontend/src/App.tsx`, import your component and add a case to `renderContent()`:

```tsx
case 'your_page':
  return <YourNewPage />;
```

---

## Step 4: Add Translation Strings

In `frontend/src/i18n/en.json` and `frontend/src/i18n/ar.json`, add translation keys:
```json
"nav": {
  "your_page": "Your Page Name"
}
```
