import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Search, Eye, Users, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import DeleteUserDialog from '@/components/DeleteUserDialog';

const AdminStudents = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    user: any | null;
  }>({ isOpen: false, user: null });

  const queryClient = useQueryClient();

  const { data: students, isLoading, error } = useQuery({
    queryKey: ['admin-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const { data: studentServices } = useQuery({
    queryKey: ['admin-student-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_services')
        .select(`
          user_id,
          services (
            id,
            title,
            type
          )
        `);

      if (error) throw error;
      return data || [];
    },
  });

  const { data: studentCourses } = useQuery({
    queryKey: ['admin-student-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_course_assignments')
        .select(`
          user_id,
          courses (
            id,
            title
          )
        `);

      if (error) throw error;
      return data || [];
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`https://oimqzyfmglyhljjuboek.supabase.co/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user');
      }

      return result;
    },
    onSuccess: () => {
      toast.success('User deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-students'] });
      setDeleteDialog({ isOpen: false, user: null });
    },
    onError: (error: any) => {
      toast.error(`Failed to delete user: ${error.message}`);
      console.error('Delete user error:', error);
    },
  });

  const handleDeleteUser = (user: any) => {
    setDeleteDialog({ isOpen: true, user });
  };

  const handleConfirmDelete = () => {
    if (deleteDialog.user) {
      deleteUserMutation.mutate(deleteDialog.user.id);
    }
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialog({ isOpen: false, user: null });
  };

  const filteredStudents = students?.filter(student =>
    student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.organization?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStudentServices = (studentId: string) => {
    return studentServices?.filter(service => service.user_id === studentId) || [];
  };

  const getStudentCourses = (studentId: string) => {
    return studentCourses?.filter(course => course.user_id === studentId) || [];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D5C4B]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-4">Error loading students</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#0D5C4B]">Student Management</h1>
          <p className="text-muted-foreground">Manage student accounts, services, and progress</p>
        </div>
        <Link to="/admin/add-user">
          <Button className="bg-[#0D5C4B] hover:bg-green-700">
            <Users className="h-4 w-4 mr-2" />
            Add Student
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Search Students</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name, email, or organization..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Students ({filteredStudents?.length || 0})</CardTitle>
              <CardDescription>All registered students in the system</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Services</TableHead>
                <TableHead>Courses</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents?.map((student) => {
                const studentServicesList = getStudentServices(student.id);
                const studentCoursesList = getStudentCourses(student.id);
                
                return (
                  <TableRow key={student.id} className="hover:bg-accent/50">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage 
                            src={student.profile_image || ''} 
                            alt={student.name || 'Student'} 
                          />
                          <AvatarFallback className="bg-[#0D5C4B] text-white">
                            {student.name?.charAt(0)?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{student.name}</p>
                          <p className="text-sm text-muted-foreground">{student.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="text-sm font-medium">{student.organization || '-'}</span>
                        {student.organization_role && (
                          <p className="text-xs text-muted-foreground">{student.organization_role}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {studentServicesList.slice(0, 2).map((service: any) => (
                          <Badge key={service.services?.id} variant="outline" className="text-xs">
                            {service.services?.title}
                          </Badge>
                        ))}
                        {studentServicesList.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{studentServicesList.length - 2} more
                          </Badge>
                        )}
                        {!studentServicesList.length && (
                          <span className="text-xs text-muted-foreground">No services</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {studentCoursesList.slice(0, 1).map((course: any) => (
                          <Badge key={course.courses?.id} variant="secondary" className="text-xs">
                            {course.courses?.title}
                          </Badge>
                        ))}
                        {studentCoursesList.length > 1 && (
                          <Badge variant="secondary" className="text-xs">
                            +{studentCoursesList.length - 1} more
                          </Badge>
                        )}
                        {!studentCoursesList.length && (
                          <span className="text-xs text-muted-foreground">No courses</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {new Date(student.created_at).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Link to={`/admin/students/${student.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(student)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          
          {filteredStudents?.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-semibold text-muted-foreground">No students found</p>
              <p className="text-sm text-muted-foreground">
                {searchTerm ? 'Try adjusting your search criteria' : 'Add your first student to get started'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete User Dialog */}
      <DeleteUserDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
        userName={deleteDialog.user?.name || ''}
        userEmail={deleteDialog.user?.email || ''}
        isDeleting={deleteUserMutation.isPending}
      />
    </div>
  );
};

export default AdminStudents;
