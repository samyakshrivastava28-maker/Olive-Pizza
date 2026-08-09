# SDUI & Studio Removal Audit

This document outlines all the components, services, and routes related to the old SDUI (Server-Driven UI), Olive Studio, Section Designer, and Website Manager that need to be removed.

## 1. Frontend Directories to Remove entirely
- `frontend/src/pages/owner/OliveStudio/`
- `frontend/src/pages/owner/SectionDesigner/`
- `frontend/src/pages/owner/WebsiteManager/`
- `frontend/src/components/sdui/`

## 2. Frontend Files to Remove / Clean up
- `frontend/src/types/sdui.types.ts`
- `frontend/src/stores/sduiStore.ts`
- `frontend/src/data/componentLibrary.ts`
- `frontend/src/utils/ownerCustomSections.ts`
- Clean up imports in `frontend/src/App.tsx` (remove routes to OliveStudio, SectionDesigner, WebsiteManager).
- Clean up `frontend/src/components/OwnerLayout.tsx` (remove navigation links to removed pages).

## 3. Backend Directories to Remove entirely
- `backend/src/services/sdui/`
- `backend/src/services/stitch/` (if it was exclusively for SDUI/Studio generation, need to confirm but user prompt says "Remove... Stitch integration that existed only for SDUI")

## 4. Backend Files & Routes to Remove
- `backend/src/routes/designStudio.routes.ts`
- `backend/src/routes/sectionDesignerProxy.routes.ts`
- `backend/src/routes/websiteManager.routes.ts`
- `backend/src/routes/stitch.routes.ts`
- `backend/src/routes/pageBuilder.routes.ts`
- Clean up `backend/src/app.ts` (remove imports and `app.use` statements for the above routes).
- Clean up `backend/src/services/websiteConfig/WebsiteConfigService.ts` and `backend/src/types/websiteConfig.types.ts` (remove SDUI-specific `HomepageConfig` and `sections` concepts).

## 5. Dependencies
- Check `package.json` for SDUI specific dependencies if any (e.g., specific drag-and-drop libs if only used in Studio, though we might need them for the new Home Page Manager).

## 6. Database / R2
- Firestore `website_config` collection: The `homepage`, `homepage_draft` documents, and `sections_library` need to be replaced with the new Home Page Manager format.
- `website_versions` collection will be replaced or modified.
- Cloudflare R2: `sdui_backups` to be replaced with `home-pages/`.
