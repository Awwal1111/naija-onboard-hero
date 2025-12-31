import { useState } from "react";
import ResponsiveLayout from "@/components/ResponsiveLayout";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon, User, Briefcase, Package, BookOpen, FileText, Filter, X, Save, Star, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useNigerianStates } from "@/hooks/useNigerianStates";
import { useSavedSearches } from "@/hooks/useSavedSearches";
import { Separator } from "@/components/ui/separator";
import ProfilePreview from "@/components/ProfilePreview";

const Search = () => {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [saveName, setSaveName] = useState("");
  const navigate = useNavigate();
  
  // Filters
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(1000000);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState("");
  const [selectedLGA, setSelectedLGA] = useState("");
  const [minRating, setMinRating] = useState<number>(0);
  const [skillInput, setSkillInput] = useState("");
  const [profilePreview, setProfilePreview] = useState<{ isOpen: boolean; userId: string | null }>({ isOpen: false, userId: null });
  
  const { states, lgas, fetchLGAs } = useNigerianStates();
  const { savedSearches, saveSearch, deleteSearch } = useSavedSearches();
  
  const hasActiveFilters = minPrice > 0 || maxPrice < 1000000 || selectedSkills.length > 0 || 
                          selectedState || selectedLGA || minRating > 0;

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["search", query, activeTab, minPrice, maxPrice, selectedSkills, selectedState, selectedLGA, minRating],
    queryFn: async () => {
      if (!query.trim()) return { users: [], posts: [], jobs: [], products: [], courses: [] };

      const results = {
        users: [] as any[],
        posts: [] as any[],
        jobs: [] as any[],
        products: [] as any[],
        courses: [] as any[],
      };

      // Helper to check premium status
      const isPremiumActive = (profile: any) => 
        profile?.is_premium && profile?.premium_expires_at && new Date(profile.premium_expires_at) > new Date();

      // Search Users - include premium fields and sort by premium
      if (activeTab === "all" || activeTab === "users") {
        let userQuery = supabase
          .from("profiles")
          .select("*, is_premium, premium_expires_at")
          .or(`full_name.ilike.%${query}%,bio.ilike.%${query}%,profession.ilike.%${query}%`)
          .limit(30);
        
        if (selectedState) userQuery = userQuery.ilike('location', `%${selectedState}%`);
        if (minRating > 0) userQuery = userQuery.gte('average_rating', minRating);
        
        const { data } = await userQuery;
        // Sort premium users first
        results.users = (data || []).sort((a, b) => {
          const aPremium = isPremiumActive(a);
          const bPremium = isPremiumActive(b);
          if (aPremium && !bPremium) return -1;
          if (!aPremium && bPremium) return 1;
          return 0;
        }).slice(0, 20);
      }

      // Search Posts - include profile premium status
      if (activeTab === "all" || activeTab === "posts") {
        const { data } = await supabase
          .from("posts")
          .select("*, profiles(*, is_premium, premium_expires_at)")
          .eq("status", "published")
          .or(`content.ilike.%${query}%`)
          .limit(30);
        // Sort premium authors first
        results.posts = (data || []).sort((a: any, b: any) => {
          const aPremium = isPremiumActive(a.profiles);
          const bPremium = isPremiumActive(b.profiles);
          if (aPremium && !bPremium) return -1;
          if (!aPremium && bPremium) return 1;
          return 0;
        }).slice(0, 20);
      }

      // Search Jobs - include poster's premium status
      if (activeTab === "all" || activeTab === "jobs") {
        let jobQuery = supabase
          .from("jobs")
          .select("*, profiles(*, is_premium, premium_expires_at)")
          .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
          .limit(30);
        
        if (minPrice > 0) jobQuery = jobQuery.gte('budget_min', minPrice);
        if (maxPrice < 1000000) jobQuery = jobQuery.lte('budget_max', maxPrice);
        if (selectedState) jobQuery = jobQuery.ilike('location', `%${selectedState}%`);
        
        const { data } = await jobQuery;
        
        // Filter by skills if selected
        let filteredJobs = data || [];
        if (selectedSkills.length > 0) {
          filteredJobs = filteredJobs.filter(job => 
            selectedSkills.some(skill => 
              job.required_skills?.some((s: string) => s.toLowerCase().includes(skill.toLowerCase()))
            )
          );
        }
        
        // Sort premium job posters first
        results.jobs = filteredJobs.sort((a: any, b: any) => {
          const aPremium = isPremiumActive(a.profiles);
          const bPremium = isPremiumActive(b.profiles);
          if (aPremium && !bPremium) return -1;
          if (!aPremium && bPremium) return 1;
          return 0;
        }).slice(0, 20);
      }

      // Search Products - include seller's premium status
      if (activeTab === "all" || activeTab === "products") {
        let productQuery = supabase
          .from("digital_products")
          .select("*, profiles:user_id(is_premium, premium_expires_at)")
          .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
          .eq('status', 'active')
          .limit(30);
        
        if (minPrice > 0) productQuery = productQuery.gte('price', minPrice);
        if (maxPrice < 1000000) productQuery = productQuery.lte('price', maxPrice);
        if (minRating > 0) productQuery = productQuery.gte('average_rating', minRating);
        
        const { data } = await productQuery;
        // Sort premium sellers first
        results.products = (data || []).sort((a: any, b: any) => {
          const aPremium = isPremiumActive(a.profiles);
          const bPremium = isPremiumActive(b.profiles);
          if (aPremium && !bPremium) return -1;
          if (!aPremium && bPremium) return 1;
          return 0;
        }).slice(0, 20);
      }

      // Search Courses - include instructor's premium status
      if (activeTab === "all" || activeTab === "courses") {
        let courseQuery = supabase
          .from("courses")
          .select("*, profiles:user_id(is_premium, premium_expires_at)")
          .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
          .eq('status', 'active')
          .limit(30);
        
        if (minPrice > 0) courseQuery = courseQuery.gte('price', minPrice);
        if (maxPrice < 1000000) courseQuery = courseQuery.lte('price', maxPrice);
        if (minRating > 0) courseQuery = courseQuery.gte('average_rating', minRating);
        
        const { data } = await courseQuery;
        // Sort premium instructors first
        results.courses = (data || []).sort((a: any, b: any) => {
          const aPremium = isPremiumActive(a.profiles);
          const bPremium = isPremiumActive(b.profiles);
          if (aPremium && !bPremium) return -1;
          if (!aPremium && bPremium) return 1;
          return 0;
        }).slice(0, 20);
      }

      return results;
    },
    enabled: query.length > 2,
  });

  const totalResults = searchResults
    ? Object.values(searchResults).reduce((sum, arr) => sum + arr.length, 0)
    : 0;

  const handleSaveSearch = () => {
    if (!saveName.trim()) {
      return;
    }
    
    saveSearch(saveName, query, {
      type: activeTab,
      minPrice: minPrice > 0 ? minPrice : undefined,
      maxPrice: maxPrice < 1000000 ? maxPrice : undefined,
      skills: selectedSkills.length > 0 ? selectedSkills : undefined,
      state: selectedState || undefined,
      lga: selectedLGA || undefined,
      minRating: minRating > 0 ? minRating : undefined,
    });
    
    setSaveName("");
  };

  const loadSavedSearch = (search: any) => {
    setQuery(search.query);
    setActiveTab(search.filters.type || "all");
    setMinPrice(search.filters.minPrice || 0);
    setMaxPrice(search.filters.maxPrice || 1000000);
    setSelectedSkills(search.filters.skills || []);
    setSelectedState(search.filters.state || "");
    setSelectedLGA(search.filters.lga || "");
    setMinRating(search.filters.minRating || 0);
    
    if (search.filters.state) {
      fetchLGAs(search.filters.state);
    }
  };

  const clearFilters = () => {
    setMinPrice(0);
    setMaxPrice(1000000);
    setSelectedSkills([]);
    setSelectedState("");
    setSelectedLGA("");
    setMinRating(0);
  };

  const addSkill = () => {
    if (skillInput.trim() && !selectedSkills.includes(skillInput.trim())) {
      setSelectedSkills([...selectedSkills, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setSelectedSkills(selectedSkills.filter(s => s !== skill));
  };

  return (
    <ResponsiveLayout>
      <div className="container max-w-6xl mx-auto p-4 space-y-4">
        {/* Search Bar */}
        <div className="flex items-center gap-2">
          <SearchIcon className="h-6 w-6 text-primary" />
          <div className="flex-1">
            <Input
              type="search"
              placeholder="Search jobs, users, courses, products..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="text-lg"
            />
          </div>
          
          {/* Filters Button */}
          <Sheet open={showFilters} onOpenChange={setShowFilters}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <Filter className="h-5 w-5" />
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Advanced Filters</SheetTitle>
              </SheetHeader>
              
              <div className="space-y-6 mt-6">
                {/* Price Range */}
                <div className="space-y-3">
                  <Label>Price Range (₦)</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      value={minPrice}
                      onChange={(e) => setMinPrice(Number(e.target.value))}
                      placeholder="Min"
                      className="w-24"
                    />
                    <span>-</span>
                    <Input
                      type="number"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(Number(e.target.value))}
                      placeholder="Max"
                      className="w-24"
                    />
                  </div>
                  <Slider
                    value={[maxPrice]}
                    onValueChange={([val]) => setMaxPrice(val)}
                    max={1000000}
                    step={1000}
                    className="mt-2"
                  />
                </div>

                <Separator />

                {/* Skills */}
                <div className="space-y-3">
                  <Label>Skills</Label>
                  <div className="flex gap-2">
                    <Input
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                      placeholder="Add skill..."
                    />
                    <Button onClick={addSkill} size="sm">Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedSkills.map(skill => (
                      <Badge key={skill} variant="secondary" className="gap-1">
                        {skill}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeSkill(skill)} />
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Location */}
                <div className="space-y-3">
                  <Label>Location</Label>
                  <Select value={selectedState} onValueChange={(val) => {
                    setSelectedState(val);
                    setSelectedLGA("");
                    fetchLGAs(val);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map(state => (
                        <SelectItem key={state.id} value={state.name}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedState && (
                    <Select value={selectedLGA} onValueChange={setSelectedLGA}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select LGA" />
                      </SelectTrigger>
                      <SelectContent>
                        {lgas.map(lga => (
                          <SelectItem key={lga.id} value={lga.name}>
                            {lga.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <Separator />

                {/* Rating */}
                <div className="space-y-3">
                  <Label>Minimum Rating</Label>
                  <Select value={minRating.toString()} onValueChange={(val) => setMinRating(Number(val))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Any rating</SelectItem>
                      <SelectItem value="1">⭐ 1+</SelectItem>
                      <SelectItem value="2">⭐ 2+</SelectItem>
                      <SelectItem value="3">⭐ 3+</SelectItem>
                      <SelectItem value="4">⭐ 4+</SelectItem>
                      <SelectItem value="5">⭐ 5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button onClick={clearFilters} variant="outline" className="flex-1">
                    Clear All
                  </Button>
                  <Button onClick={() => setShowFilters(false)} className="flex-1">
                    Apply Filters
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Save Search */}
          {query.length > 2 && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <Save className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Search</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Search Name</Label>
                    <Input
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      placeholder="e.g., React Developer Jobs"
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Query: {query}</p>
                    {hasActiveFilters && <p className="mt-1">With active filters</p>}
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleSaveSearch} disabled={!saveName.trim()}>
                    Save Search
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Saved Searches */}
        {savedSearches.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Saved Searches</Label>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {savedSearches.map(search => (
                <Card key={search.id} className="min-w-fit cursor-pointer hover:bg-accent transition-colors">
                  <CardContent className="p-3 flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary" />
                    <span onClick={() => loadSavedSearch(search)} className="text-sm font-medium">
                      {search.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSearch(search.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {minPrice > 0 && (
              <Badge variant="secondary">Min: ₦{minPrice.toLocaleString()}</Badge>
            )}
            {maxPrice < 1000000 && (
              <Badge variant="secondary">Max: ₦{maxPrice.toLocaleString()}</Badge>
            )}
            {selectedSkills.map(skill => (
              <Badge key={skill} variant="secondary">{skill}</Badge>
            ))}
            {selectedState && <Badge variant="secondary">{selectedState}</Badge>}
            {selectedLGA && <Badge variant="secondary">{selectedLGA}</Badge>}
            {minRating > 0 && <Badge variant="secondary">Rating: {minRating}+</Badge>}
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear all
            </Button>
          </div>
        )}

        {query.length > 2 && (
          <div className="text-sm text-muted-foreground">
            {isLoading ? "Searching..." : `${totalResults} results found`}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="users">
              <User className="h-4 w-4 mr-2" />
              Users ({searchResults?.users.length || 0})
            </TabsTrigger>
            <TabsTrigger value="posts">
              <FileText className="h-4 w-4 mr-2" />
              Posts ({searchResults?.posts.length || 0})
            </TabsTrigger>
            <TabsTrigger value="jobs">
              <Briefcase className="h-4 w-4 mr-2" />
              Jobs ({searchResults?.jobs.length || 0})
            </TabsTrigger>
            <TabsTrigger value="products">
              <Package className="h-4 w-4 mr-2" />
              Products ({searchResults?.products.length || 0})
            </TabsTrigger>
            <TabsTrigger value="courses">
              <BookOpen className="h-4 w-4 mr-2" />
              Courses ({searchResults?.courses.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {/* Users Results */}
            {(activeTab === "all" || activeTab === "users") && searchResults?.users.map((user) => (
              <Card 
                key={user.user_id} 
                className="cursor-pointer hover:shadow-lg transition-shadow" 
                onClick={() => setProfilePreview({ isOpen: true, userId: user.user_id })}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.profile_picture} />
                      <AvatarFallback>{user.full_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold">{user.full_name}</h3>
                      <p className="text-sm text-muted-foreground">{user.profession}</p>
                      {user.bio && <p className="text-sm mt-1 line-clamp-2">{user.bio}</p>}
                    </div>
                    <Badge>User</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Posts Results */}
            {(activeTab === "all" || activeTab === "posts") && searchResults?.posts.map((post) => (
              <Card key={post.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={post.profiles?.profile_picture} />
                      <AvatarFallback>{post.profiles?.full_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{post.profiles?.full_name}</h4>
                      <p className="text-sm mt-1 line-clamp-3">{post.content}</p>
                    </div>
                    <Badge variant="secondary">Post</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Jobs Results */}
            {(activeTab === "all" || activeTab === "jobs") && searchResults?.jobs.map((job) => (
              <Card key={job.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(`/jobs/${job.id}`)}>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold">{job.title}</h3>
                      <Badge className="bg-primary">
                        ₦{job.budget_min?.toLocaleString()} - ₦{job.budget_max?.toLocaleString()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
                    <div className="flex gap-2">
                      {job.required_skills?.slice(0, 3).map((skill: string) => (
                        <Badge key={skill} variant="outline">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Products Results */}
            {(activeTab === "all" || activeTab === "products") && searchResults?.products.map((product) => (
              <Card key={product.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(`/products/${product.id}`)}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                     {product.preview_url && (
                      <img src={product.preview_url} alt={product.title} className="w-24 h-24 object-cover rounded" />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold">{product.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge className="bg-primary">₦{product.price?.toLocaleString()}</Badge>
                        {product.average_rating > 0 && (
                          <Badge variant="outline">⭐ {product.average_rating.toFixed(1)}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Courses Results */}
            {(activeTab === "all" || activeTab === "courses") && searchResults?.courses.map((course) => (
              <Card key={course.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(`/courses/${course.id}`)}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                     {course.thumbnail_url && (
                      <img src={course.thumbnail_url} alt={course.title} className="w-24 h-24 object-cover rounded" />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold">{course.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge className="bg-primary">₦{course.price?.toLocaleString()}</Badge>
                        {course.average_rating > 0 && (
                          <Badge variant="outline">⭐ {course.average_rating.toFixed(1)}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {query.length > 2 && !isLoading && totalResults === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <SearchIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No results found for "{query}"</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Profile Preview Dialog */}
      <ProfilePreview
        isOpen={profilePreview.isOpen}
        onClose={() => setProfilePreview({ isOpen: false, userId: null })}
        profileId={profilePreview.userId || ''}
      />
    </ResponsiveLayout>
  );
};

export default Search;
