"use client";

import { useState } from 'react';
import { Share2, ThumbsUp, MessageCircle, BarChart2, Plus, Settings, Link as LinkIcon, Image as ImageIcon, Check } from 'lucide-react';
import { PageWrapper, CardWrapper } from '@/components/ui/page-wrapper';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SocialMediaPage() {
    const platformsData = [
        { name: "LinkedIn", handle: "@EarthanaERP", followers: "12.4k", growth: "+5%", color: "bg-[#0077b5]", text: "text-white", connected: true },
        { name: "Twitter / X", handle: "@earthanaerp", followers: "8.2k", growth: "+12%", color: "bg-black", text: "text-white", connected: true },
        { name: "Instagram", handle: "@earthanatech", followers: "15.6k", growth: "+8%", color: "bg-gradient-to-r from-purple-500 to-pink-500", text: "text-white", connected: true },
        { name: "Facebook", handle: "Not Connected", followers: "-", growth: "-", color: "bg-[#1877F2]", text: "text-white", connected: false },
    ];

    const [platforms, setPlatforms] = useState(platformsData);
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [postContent, setPostContent] = useState('');
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['LinkedIn']);
    const [isPosting, setIsPosting] = useState(false);

    const togglePlatformSelection = (name: string) => {
        if (selectedPlatforms.includes(name)) {
            setSelectedPlatforms(selectedPlatforms.filter(p => p !== name));
        } else {
            setSelectedPlatforms([...selectedPlatforms, name]);
        }
    };

    const handleCreatePost = (e: React.FormEvent) => {
        e.preventDefault();
        if (!postContent) {
            toast.error("Please add content to your post");
            return;
        }
        setIsPosting(true);
        // Mock API call
        setTimeout(() => {
            toast.success(`Post published to ${selectedPlatforms.join(', ')}`);
            setIsPosting(false);
            setIsPostModalOpen(false);
            setPostContent('');
        }, 1500);
    };

    const toggleConnection = (index: number) => {
        const newPlatforms = [...platforms];
        newPlatforms[index].connected = !newPlatforms[index].connected;
        if (newPlatforms[index].connected) {
            toast.success(`Connected to ${newPlatforms[index].name}`);
            newPlatforms[index].handle = "@earthana_official"; // Mock update
        } else {
            toast.info(`Disconnected from ${newPlatforms[index].name}`);
            newPlatforms[index].handle = "Not Connected";
        }
        setPlatforms(newPlatforms);
    };

    const posts = [
        { id: 1, content: "🚀 Excited to announce our new Inventory Module! #ERP #Tech #SaaS", platform: "LinkedIn", date: "2h ago", likes: 245, comments: 42, views: "5.2k" },
        { id: 2, content: "Join us this Friday for a live demo of Earthana. Register now! 📅", platform: "Twitter / X", date: "5h ago", likes: 89, comments: 12, views: "1.8k" },
        { id: 3, content: "Behind the scenes at our annual team retreat! 🏞️", platform: "Instagram", date: "1d ago", likes: 1240, comments: 85, views: "12k" },
    ];

    return (
        <PageWrapper className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Social Media</h1>
                    <p className="text-gray-500">Manage accounts and track engagement.</p>
                </div>
                <Button
                    onClick={() => setIsPostModalOpen(true)}
                    className="flex items-center gap-2 bg-primary text-primary-foreground hover:brightness-[1.08] transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Create Post
                </Button>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="accounts">Connected Accounts</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6 mt-6">
                    {/* Platform Stats */}
                    <div className="grid gap-6 md:grid-cols-4">
                        {platforms.filter(p => p.connected).map((p) => (
                            <CardWrapper key={p.name} className={`${p.color} ${p.text} p-6 rounded-xl shadow-md relative overflow-hidden group`}>
                                <div className="relative z-10">
                                    <h3 className="font-bold text-lg">{p.name}</h3>
                                    <p className="opacity-80 text-sm mb-4">{p.handle}</p>
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <p className="text-3xl font-bold">{p.followers}</p>
                                            <p className="text-xs opacity-80">Followers</p>
                                        </div>
                                        <span className="bg-white/20 px-2 py-1 rounded text-xs font-medium backdrop-blur-sm">{p.growth}</span>
                                    </div>
                                </div>
                            </CardWrapper>
                        ))}
                    </div>

                    {/* Recent Posts */}
                    <div className="glass-card p-6 rounded-xl">
                        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <Share2 className="w-5 h-5 text-gray-500" />
                            Recent Posts
                        </h3>
                        <div className="space-y-6">
                            {posts.map((post) => (
                                <div key={post.id} className="flex flex-col md:flex-row gap-4 p-4 rounded-lg bg-background/50 border border-gray-100">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full text-white",
                                                post.platform === 'LinkedIn' ? 'bg-[#0077b5]' :
                                                    post.platform === 'Twitter / X' ? 'bg-black' :
                                                        post.platform === 'Instagram' ? 'bg-pink-600' : 'bg-blue-600'
                                            )}>
                                                {post.platform}
                                            </span>
                                            <span className="text-xs text-gray-400">{post.date}</span>
                                        </div>
                                        <p className="text-sm text-gray-800 font-medium leading-relaxed">{post.content}</p>
                                    </div>

                                    <div className="flex items-center gap-6 text-gray-500 text-sm border-t md:border-t-0 md:border-l border-gray-200 pt-3 md:pt-0 md:pl-6 md:min-w-[250px]">
                                        <div className="flex items-center gap-1.5" title="Likes">
                                            <ThumbsUp className="w-4 h-4" /> {post.likes}
                                        </div>
                                        <div className="flex items-center gap-1.5" title="Comments">
                                            <MessageCircle className="w-4 h-4" /> {post.comments}
                                        </div>
                                        <div className="flex items-center gap-1.5" title="Reach">
                                            <BarChart2 className="w-4 h-4" /> {post.views}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="accounts" className="mt-6">
                    <CardWrapper className="glass-card p-6 rounded-xl">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Manage Account Connections</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            {platforms.map((p, idx) => (
                                <div key={p.name} className="flex items-center justify-between p-4 border rounded-lg hover:bg-background transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold", p.color)}>
                                            {p.name[0]}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-gray-900">{p.name}</h4>
                                            <p className="text-xs text-gray-500">{p.connected ? p.handle : "Not connected"}</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={p.connected}
                                        onCheckedChange={() => toggleConnection(idx)}
                                    />
                                </div>
                            ))}
                        </div>
                    </CardWrapper>
                </TabsContent>
            </Tabs>

            {/* Create Post Modal */}
            <Dialog open={isPostModalOpen} onOpenChange={setIsPostModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Create New Post</DialogTitle>
                    </DialogHeader>

                    <div className="grid md:grid-cols-3 gap-6 py-4">
                        <div className="md:col-span-2 space-y-4">
                            <div className="space-y-2">
                                <Label>Post Content</Label>
                                <Textarea
                                    placeholder="What do you want to share?"
                                    className="min-h-[150px] resize-none"
                                    value={postContent}
                                    onChange={(e) => setPostContent(e.target.value)}
                                />
                                <div className="flex justify-between items-center text-xs text-gray-400">
                                    <span>{postContent.length} chars</span>
                                    <Button variant="ghost" size="sm" className="h-8">
                                        <ImageIcon className="w-4 h-4 mr-2" /> Add Media
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-8 text-blue-600">
                                        Generate AI Caption
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 border-l pl-6">
                            <Label>Select Platforms</Label>
                            <div className="space-y-2">
                                {platforms.filter(p => p.connected).map((p) => (
                                    <div
                                        key={p.name}
                                        onClick={() => togglePlatformSelection(p.name)}
                                        className={cn(
                                            "flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-all text-sm",
                                            selectedPlatforms.includes(p.name) ? "border-blue-500 bg-white text-blue-700" : "border-gray-200 hover:bg-background"
                                        )}
                                    >
                                        <div className={cn("w-2 h-2 rounded-full", selectedPlatforms.includes(p.name) ? "bg-blue-600" : "bg-white")} />
                                        {p.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPostModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreatePost} disabled={isPosting}>
                            {isPosting ? "Publishing..." : "Post Now"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </PageWrapper>
    );
}
