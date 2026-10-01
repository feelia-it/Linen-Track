import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { getTemplates, deleteTemplate } from '../services/api';
import { FileText, Plus, Pencil, Trash2, Globe, Building2, Store } from 'lucide-react';
import { toast } from 'sonner';

const Templates = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTemplates = async () => {
    try {
      const data = await getTemplates();
      setTemplates(data);
    } catch (error) {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleDelete = async (templateId) => {
    if (window.confirm('Are you sure?')) {
      try {
        await deleteTemplate(templateId);
        toast.success('Template deleted');
        fetchTemplates();
      } catch (error) {
        toast.error('Failed to delete');
      }
    }
  };

  const getScopeIcon = (scope) => {
    switch (scope) {
      case 'global': return <Globe className="w-4 h-4" />;
      case 'company': return <Building2 className="w-4 h-4" />;
      case 'outlet': return <Store className="w-4 h-4" />;
      default: return null;
    }
  };

  const filteredTemplates = templates.filter(t =>
    t.template_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout title="Templates">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
            data-testid="search-templates"
          />
          <Button onClick={() => navigate('/form-builder')} data-testid="create-template-btn">
            <Plus className="w-4 h-4 mr-2" />Create Template
          </Button>
        </div>

        {loading ? (
          <div className="p-8 text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No templates found</p>
              <Button onClick={() => navigate('/form-builder')}>Create your first template</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <Card key={template.template_id} className="card-interactive" data-testid={`template-card-${template.template_id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getScopeIcon(template.scope)}
                      <CardTitle className="text-base">{template.template_name}</CardTitle>
                    </div>
                    <Badge variant="outline" className="capitalize">{template.scope}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <span>{template.page_size} - {template.orientation}</span>
                    <span>{template.canvas_elements?.length || 0} elements</span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => navigate(`/form-builder/${template.template_id}`)}
                    >
                      <Pencil className="w-4 h-4 mr-1" />Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(template.template_id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Templates;
