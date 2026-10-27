import { EmptyState } from "@erp/ui";

export default function PeoplePage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>People</h1>
          <p>Manage company access without crossing tenant boundaries.</p>
        </div>
        <button className="button button-primary" type="button">
          Invite user
        </button>
      </div>
      <EmptyState
        title="No additional company users"
        description="Invited users and their company roles will appear here."
      />
    </>
  );
}
