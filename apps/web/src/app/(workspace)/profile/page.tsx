import { ErrorState } from "@erp/ui";

export default function ProfilePage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Your profile</h1>
          <p>Personal details and security preferences.</p>
        </div>
      </div>
      <ErrorState
        title="Profile editing is not enabled yet"
        description="The authenticated profile endpoint and step-up security flow will be connected in a later foundation slice."
      />
    </>
  );
}
