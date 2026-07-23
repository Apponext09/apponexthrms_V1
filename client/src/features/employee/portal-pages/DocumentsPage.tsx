import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FolderOpen, Download, FileUp, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function DocumentsPage() {
  const docs = [
    { name: 'Offer_Letter.pdf', size: '2.4 MB', date: '2026-06-01', folder: 'Onboarding' },
    { name: 'June_2026_Payslip.pdf', size: '154 KB', date: '2026-07-01', folder: 'Payslips' },
    { name: 'HRA_Rent_Receipts_FY27.pdf', size: '1.2 MB', date: '2026-07-22', folder: 'Tax Documents' },
  ];

  const handleDownload = (name: string) => {
    toast.success(`Downloading file: ${name}...`);
  };

  const handleUpload = () => {
    toast.info('File upload interface will open.');
  };

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-foreground">My Documents</h2>
          <p className="text-xs text-muted-foreground">Access official company paperwork, offer letters, and personal uploads.</p>
        </div>
        <Button onClick={handleUpload} className="bg-violet-600 hover:bg-violet-700 text-white font-bold gap-1.5 rounded-xl shadow">
          <FileUp className="w-4.5 h-4.5" /> Upload File
        </Button>
      </div>

      <Card className="border rounded-2xl shadow-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <FolderOpen className="w-4.5 h-4.5 text-violet-500" /> Files & Folders
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold text-xs uppercase px-6 py-4">File Name</TableHead>
                <TableHead className="font-bold text-xs uppercase px-6 py-4">Folder</TableHead>
                <TableHead className="font-bold text-xs uppercase px-6 py-4">File Size</TableHead>
                <TableHead className="font-bold text-xs uppercase px-6 py-4">Modified Date</TableHead>
                <TableHead className="font-bold text-xs uppercase px-6 py-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((doc, idx) => (
                <TableRow key={idx}>
                  <TableCell className="px-6 py-4 text-xs font-semibold text-foreground">{doc.name}</TableCell>
                  <TableCell className="px-6 py-4 text-xs">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300">
                      {doc.folder}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-xs font-mono font-medium">{doc.size}</TableCell>
                  <TableCell className="px-6 py-4 text-xs font-semibold">{doc.date}</TableCell>
                  <TableCell className="px-6 py-4 text-xs text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDownload(doc.name)}
                      className="h-8 hover:text-violet-600 font-semibold gap-1 text-xs"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
