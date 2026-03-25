import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CheckCircle, XCircle } from 'lucide-react';

interface Credential {
  credential_id: string;
  valid: boolean;
  status: string;
  student_name: string;
  course_title: string;
  iicrc_discipline: string;
  cec_hours: number;
  issued_date: string;
  issuing_organisation: string;
  verification_url: string;
  cppp40421_unit_code?: string;
}

export function CredentialVerificationCard({ credential }: { credential: Credential }) {
  const isValid = credential.valid;

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader className="pb-2 text-center">
        <div className="mb-3 flex justify-center">
          {isValid ? (
            <CheckCircle className="h-16 w-16 text-green-500" />
          ) : (
            <XCircle className="h-16 w-16 text-red-500" />
          )}
        </div>
        <Badge variant={isValid ? 'default' : 'destructive'} className="mx-auto px-6 py-2 text-lg">
          {isValid ? 'VERIFIED' : 'REVOKED'}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">This certifies that</p>
          <h2 className="mt-1 text-3xl font-bold">{credential.student_name}</h2>
          <p className="text-muted-foreground mt-2 text-sm">has successfully completed</p>
          <h3 className="mt-1 text-xl font-semibold">{credential.course_title}</h3>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          <div>
            <p className="text-muted-foreground text-xs tracking-wide uppercase">
              IICRC Discipline
            </p>
            <Badge variant="outline" className="mt-1 text-base font-bold">
              {credential.iicrc_discipline}
            </Badge>
          </div>
          <div>
            <p className="text-muted-foreground text-xs tracking-wide uppercase">CECs Awarded</p>
            <p className="mt-1 text-lg font-bold">{credential.cec_hours} CECs</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs tracking-wide uppercase">Date Issued</p>
            <p className="mt-1 font-medium">{credential.issued_date}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs tracking-wide uppercase">Credential ID</p>
            <p className="mt-1 font-mono text-sm">{credential.credential_id}</p>
          </div>
          {credential.cppp40421_unit_code && (
            <div className="col-span-2">
              <p className="text-muted-foreground text-xs tracking-wide uppercase">CPP40421 Unit</p>
              <p className="mt-1 font-medium">{credential.cppp40421_unit_code}</p>
            </div>
          )}
        </div>

        <div className="border-t pt-4 text-center">
          <p className="text-muted-foreground text-sm">{credential.issuing_organisation}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Verify at: <span className="font-mono">{credential.verification_url}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
