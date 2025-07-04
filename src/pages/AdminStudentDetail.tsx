
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, User, Zap, BookOpen, FileText, Plus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import AssignServiceModal from '@/components/AssignServiceModal';
import AdminFilesList from '@/components/AdminFilesList';

const AdminStudentDetail = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [showAssignService, setShowAssignService] = useState(false);
  const [showAssignCourse, setShowAssignCourse] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
    organization_role: ''
  });

  const { data: student, isLoading } = useQuery({
    queryKey: ['admin-student', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: userServices } = useQuery({
    queryKey: ['admin-student-services', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_services')
        .select(`
          id,
          status,
          assigned_at,
          service_id,
          services (
            id,
            title,
            type,
            description
          )
        `)
        .eq('user_id', id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const { data: userCourses } = useQuery({
    queryKey: ['admin-student-courses', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_course_assignments')
        .select(`
          id,
          locked,
          course_id,
          courses (
            id,
            title,
            description
          )
        `)
        .eq('user_id', id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const { data: availableCourses } = useQuery({
    queryKey: ['admin-available-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, description')
        .order('title');

      if (error) throw error;
      return data || [];
    },
  });

  React.useEffect(() => {
    if (student) {
      setFormData({
        name: student.name || '',
        email: student.email || '',
        organization: student.organization || '',
        organization_role: student.organization_role || ''
      });
    }
  }, [student]);

  const updateStudentMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Student updated successfully');
      setEditMode(false);
      queryClient.invalidateQueries({ queryKey: ['admin-student', id] });
    },
    onError: (error) => {
      toast.error('Failed to update student');
      console.error('Update error:', error);
    },
  });

  const removeServiceMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      const { error } = await supabase
        .from('user_services')
        .delete()
        .eq('user_id', id)
        .eq('service_id', serviceId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Service removed successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-student-services', id] });
    },
    onError: (error) => {
      toast.error('Failed to remove service');
      console.error('Remove service error:', error);
    },
  });

  const removeCourseAssignmentMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase
        .from('user_course_assignments')
        .delete()
        .eq('user_id', id)
        .eq('course_id', courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Course assignment removed successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-student-courses', id] });
    },
    onError: (error) => {
      toast.error('Failed to remove course assignment');
      console.error('Remove course assignment error:', error);
    },
  });

  const assignCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase
        .from('user_course_assignments')
        .insert({
          user_id: id,
          course_id: courseId,
          locked: false
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Course assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-student-courses', id] });
      setShowAssignCourse(false);
      setSelectedCourse('');
    },
    onError: (error: any) => {
      toast.error(`Failed to assign course: ${error.message}`);
    },
  });

  const handleSave = () => {
    updateStudentMutation.mutate(formData);
  };

  const handleAssignCourse = () => {
    if (!selectedCourse) {
      toast.error('Please select a course');
      return;
    }
    assignCourseMutation.mutate(selectedCourse);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D5C4B]"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-8">
        <p className="text-lg font-semibold text-muted-foreground">Student not found</p>
      </div>
    );
  }

  const assignedServiceIds = userServices?.map(us => us.service_id).filter(Boolean) || [];
  const assignedCourseIds = userCourses?.map(uc => uc.course_id).filter(Boolean) || [];
  const availableCoursesToAssign = availableCourses?.filter(course => !assignedCourseIds.includes(course.id)) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link to="/admin/students">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center space-x-4">
          {student.profile_image && (
            <img 
              src={student.profile_image} 
              alt={student.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-[#0D5C4B]"
            />
          )}
          <div>
            <h1 className="text-3xl font-bold text-[#0D5C4B]">{student.name}</h1>
            <p className="text-muted-foreground">Manage student profile and assignments</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Profile */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-[#0D5C4B]" />
                <CardTitle>Profile Information</CardTitle>
              </div>
              <Button
                variant={editMode ? "default" : "outline"}
                onClick={() => editMode ? handleSave() : setEditMode(true)}
                disabled={updateStudentMutation.isPending}
              >
                {editMode ? 'Save Changes' : 'Edit Profile'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  disabled={!editMode}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  disabled={!editMode}
                />
              </div>
              <div>
                <Label htmlFor="organization">Organization</Label>
                <Input
                  id="organization"
                  value={formData.organization}
                  onChange={(e) => setFormData({...formData, organization: e.target.value})}
                  disabled={!editMode}
                />
              </div>
              <div>
                <Label htmlFor="organization_role">Role in Organization</Label>
                <Input
                  id="organization_role"
                  value={formData.organization_role}
                  onChange={(e) => setFormData({...formData, organization_role: e.target.value})}
                  disabled={!editMode}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-4 bg-[#0D5C4B]/10 rounded-lg">
              <p className="text-2xl font-bold text-[#0D5C4B]">{userServices?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Active Services</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{userCourses?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Enrolled Courses</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Services */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-[#0D5C4B]" />
              <CardTitle>Assigned Services</CardTitle>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowAssignService(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Assign Service
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userServices?.map((userService: any) => (
              <div key={userService.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{userService.services?.title}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeServiceMutation.mutate(userService.service_id)}
                    disabled={removeServiceMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{userService.services?.description}</p>
                <div className="flex justify-between items-center">
                  <Badge variant="outline" className="capitalize">
                    {userService.services?.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(userService.assigned_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
            {!userServices?.length && (
              <div className="col-span-2 text-center py-8">
                <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No services assigned</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Courses */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-[#0D5C4B]" />
              <CardTitle>Enrolled Courses</CardTitle>
            </div>
            <Dialog open={showAssignCourse} onOpenChange={setShowAssignCourse}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Course
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Course to Student</DialogTitle>
                  <DialogDescription>
                    Select a course to assign to {student.name}.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="course">Course</Label>
                    <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a course" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCoursesToAssign?.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      onClick={handleAssignCourse}
                      disabled={assignCourseMutation.isPending || !selectedCourse}
                      className="bg-[#0D5C4B] hover:bg-green-700"
                    >
                      {assignCourseMutation.isPending ? 'Assigning...' : 'Assign Course'}
                    </Button>
                    <Button variant="outline" onClick={() => setShowAssignCourse(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {userCourses?.map((assignment: any) => (
              <div key={assignment.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{assignment.courses?.title}</h3>
                    <p className="text-sm text-muted-foreground">{assignment.courses?.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={assignment.locked ? "destructive" : "default"}>
                      {assignment.locked ? 'Locked' : 'Active'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCourseAssignmentMutation.mutate(assignment.course_id)}
                      disabled={removeCourseAssignmentMutation.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {!userCourses?.length && (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No courses assigned</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Files Section */}
      <AdminFilesList 
        studentId={id!} 
        studentName={student.name}
      />

      {/* Modals */}
      <AssignServiceModal
        open={showAssignService}
        onOpenChange={setShowAssignService}
        studentId={id!}
        assignedServiceIds={assignedServiceIds}
      />
    </div>
  );
};

export default AdminStudentDetail;
