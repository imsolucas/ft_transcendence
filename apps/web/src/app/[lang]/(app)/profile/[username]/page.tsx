import { Suspense } from "react";
import { ProfileSkeleton, ProfileView } from "./profile-view";

export default function Page() {
  // The username is only known at request time: useParams needs a Suspense boundary (cacheComponents)
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileView />
    </Suspense>
  );
}
