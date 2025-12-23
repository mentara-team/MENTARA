import React from 'react';
import ExamManagerNew from '../components/admin/ExamManagerNew';
import { GraduationCap, FileText } from 'lucide-react';

import AppShell from '../components/layout/AppShell';
import TeacherNav from '../components/layout/TeacherNav';

function TeacherExams() {
  return (
    <AppShell
      brandIcon={(
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <GraduationCap className="w-6 h-6 text-bg" />
        </div>
      )}
      brandTitle="Mentara"
      brandSubtitle="Teacher"
      nav={<TeacherNav active="exams" />}
      right={<div className="text-sm text-text-secondary hidden sm:flex items-center gap-2"><FileText className="w-4 h-4" />Manage Exams</div>}
    >
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text">Exams</h1>
        <p className="text-text-secondary">Create, edit, and publish tests for students.</p>
      </div>
      <ExamManagerNew />
    </AppShell>
  );
}

export default TeacherExams;
