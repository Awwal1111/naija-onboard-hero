import { useState } from "react";
import ResponsiveLayout from "@/components/ResponsiveLayout";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search as SearchIcon, User, Briefcase, Package, BookOpen, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const Search = () => {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const navigate = useNavigate();

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["search", query, activeTab],
    queryFn: async () => {
      if (!query.trim()) return { users: [], posts: [], jobs: [], products: [], courses: [] };

      const results = {
        users: [] as any[],
        posts: [] as any[],
        jobs: [] as any[],
        products: [] as any[],
        courses: [] as any[],
      };

      // Search Users
      if (activeTab === "all" || activeTab === "users") {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .or(`full_name.ilike.%${query}%,bio.ilike.%${query}%,profession.ilike.%${query}%`)
          .limit(20);
        results.users = data || [];
      }

      // Search Posts
      if (activeTab === "all" || activeTab === "posts") {
        const { data } = await supabase
          .from("posts")
          .select("*, profiles(*)")
          .eq("status", "published")
          .or(`content.ilike.%${query}%`)
          .limit(20);
        results.posts = data || [];
      }

      // Search Jobs
      if (activeTab === "all" || activeTab === "jobs") {
        const { data } = await supabase
          .from("jobs")
          .select("*, profiles(*)")
          .or(`title.ilike.%${query}%,description.ilike.%${query}%,skills_required.cs.{${query}}`)
          .limit(20);
        results.jobs = data || [];
      }

      // Search Products
      if (activeTab === "all" || activeTab === "products") {
        const { data } = await supabase
          .from("digital_products")
          .select("*")
          .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
          .limit(20);
        results.products = data || [];
      }

      // Search Courses
      if (activeTab === "all" || activeTab === "courses") {
        const { data } = await supabase
          .from("courses")
          .select("*")
          .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
          .limit(20);
        results.courses = data || [];
      }

      return results;
    },
    enabled: query.length > 2,
  });

  const totalResults = searchResults
    ? Object.values(searchResults).reduce((sum, arr) => sum + arr.length, 0)
    : 0;

  return (
    <ResponsiveLayout>
      <div className="container max-w-6xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-4">
          <SearchIcon className="h-8 w-8 text-primary" />
          <div className="flex-1">
            <Input
              type="search"
              placeholder="Search users, posts, jobs, products, courses..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="text-lg"
            />
          </div>
        </div>

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
              <Card key={user.user_id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(`/profile/${user.user_id}`)}>
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
                      <Badge className="bg-green-600">₦{job.budget}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
                    <div className="flex gap-2">
                      {job.skills_required?.slice(0, 3).map((skill: string) => (
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
                    {product.images?.[0] && (
                      <img src={product.images[0]} alt={product.name} className="w-24 h-24 object-cover rounded" />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold">{product.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge className="bg-green-600">₦{product.price}</Badge>
                        <Badge variant="outline">{product.category}</Badge>
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
                    {course.thumbnail && (
                      <img src={course.thumbnail} alt={course.title} className="w-24 h-24 object-cover rounded" />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold">{course.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge className="bg-green-600">₦{course.price}</Badge>
                        <Badge variant="outline">{course.level}</Badge>
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
    </ResponsiveLayout>
  );
};

export default Search;
