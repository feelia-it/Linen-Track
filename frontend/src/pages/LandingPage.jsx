import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/ui/button';
import { 
  Boxes, 
  Building2, 
  Shield, 
  BarChart3, 
  FileText, 
  ChevronRight,
  Sun,
  Moon,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

const LandingPage = () => {
  const { isAuthenticated, login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const features = [
    {
      icon: Building2,
      title: 'Multi-Franchise Support',
      description: 'Manage multiple companies and outlets with complete data isolation'
    },
    {
      icon: Shield,
      title: 'Audit-Safe Tracking',
      description: 'Every action logged with immutable audit trail for legal compliance'
    },
    {
      icon: BarChart3,
      title: 'Auto Stock Calculation',
      description: 'Never manually calculate. System auto-computes all inventory movements'
    },
    {
      icon: FileText,
      title: 'Custom Issuance Forms',
      description: 'Drag-and-drop builder for professional A4 PDF documents'
    }
  ];

  const benefits = [
    'Configurable size & unique code tracking',
    'Role-based access control',
    'Real-time low stock alerts',
    'Staff outstanding item tracking',
    'Vendor performance reports',
    'Excel & PDF exports'
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-header">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-sm bg-primary flex items-center justify-center">
              <Boxes className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl" style={{ fontFamily: 'Manrope, sans-serif' }}>UniForm</span>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="landing-theme-toggle">
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Button onClick={login} className="btn-tactile" data-testid="login-btn">
              Sign In with Google
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1769442263119-075ee26ba1bd?crop=entropy&cs=srgb&fm=jpg&q=85)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="container mx-auto relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Enterprise-Grade Inventory Management
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Uniform & Asset
              <span className="text-primary"> Inventory</span>
              <br />
              Made Audit-Safe
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              The franchise-ready system that eliminates manual stock calculations. 
              Receive, Issue, Return, Track — with legal-grade documentation.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={login} className="btn-tactile text-base" data-testid="hero-login-btn">
                Get Started Free
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="btn-tactile text-base">
                View Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Built for Franchises
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Every feature designed to handle multi-location complexity while keeping operations simple
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={idx} 
                  className="card-widget animate-slide-in"
                  style={{ animationDelay: `${idx * 100}ms` }}
                  data-testid={`feature-card-${idx}`}
                >
                  <div>
                    <div className="w-12 h-12 rounded-sm bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-semibold mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Everything You Need
                <br />
                <span className="text-primary">Nothing You Don't</span>
              </h2>
              <p className="text-muted-foreground mb-8">
                Stop wrestling with spreadsheets. Our system handles the complexity so your team can focus on operations.
              </p>
              
              <ul className="space-y-3">
                {benefits.map((benefit, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>

              <Button onClick={login} className="mt-8 btn-tactile" data-testid="benefits-login-btn">
                Start Managing Inventory
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <div className="relative">
              <div 
                className="aspect-video rounded-sm overflow-hidden border shadow-xl"
                style={{
                  backgroundImage: 'url(https://images.unsplash.com/photo-1769355104335-acef3aa4c9b6?crop=entropy&cs=srgb&fm=jpg&q=85)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
              <div className="absolute -bottom-6 -left-6 bg-card border rounded-sm shadow-lg p-4 max-w-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="font-mono text-2xl font-semibold">99.9%</p>
                    <p className="text-xs text-muted-foreground">Inventory Accuracy</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-secondary text-secondary-foreground">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-semibold mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Ready to Eliminate Inventory Chaos?
          </h2>
          <p className="text-secondary-foreground/70 mb-8 max-w-xl mx-auto">
            Join franchises that trust our system for audit-safe, legally defensible inventory management.
          </p>
          <Button 
            size="lg" 
            variant="default"
            className="bg-primary hover:bg-orange-600 btn-tactile"
            onClick={login}
            data-testid="cta-login-btn"
          >
            Get Started Now
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-primary" />
            <span className="font-semibold">UniForm</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 UniForm Inventory System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
