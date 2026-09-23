import { notFound } from 'next/navigation';
import { getDocument, getUsers, type DocumentDetail, type User } from '@/lib/api';
import { EditDocumentForm } from './edit-document-form';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditDocumentPage({ params }: Props) {
  const { id } = await params;

  let document: DocumentDetail;
  let users: User[];
  try {
    [document, users] = await Promise.all([getDocument(id), getUsers()]);
  } catch {
    notFound();
  }

  return (
    <div>
      <h1 className="page-title">Edit document</h1>
      <p className="page-subtitle">
        Update the title, body, or approval stages. Changing stages resets the
        workflow to the first stage.
      </p>
      <div className="mt-8">
        <EditDocumentForm document={document} users={users} />
      </div>
    </div>
  );
}
