'use client';

import React, { useState } from 'react';
import { 
  BarChart3, Upload, Trash, Plus, Search, Tag, 
  DollarSign, Package, TrendingUp, Users, ArrowLeft 
} from 'lucide-react';
import { Garment, ALL_GARMENTS } from '../utils/outfitLibrary';

interface AdminDashboardProps {
  onBackToMirror: () => void;
}

export default function AdminDashboard({ onBackToMirror }: AdminDashboardProps) {
  const [garments, setGarments] = useState<Garment[]>(ALL_GARMENTS);
  const [activeTab, setActiveTab] = useState<'analytics' | 'uploader' | 'library'>('analytics');

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<Garment['type']>('top');
  const [category, setCategory] = useState('Casual');
  const [subcategory, setSubcategory] = useState('T-Shirts');
  const [gender, setGender] = useState<Garment['gender']>('unisex');
  const [price, setPrice] = useState('59');
  const [colors, setColors] = useState('#FF0000');
  const [texture, setTexture] = useState<any>('plain');
  const [description, setDescription] = useState('');

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;

    const newGarment: Garment = {
      id: `custom_garment_${Date.now()}`,
      name,
      type,
      category,
      subcategory,
      gender,
      colors: [colors],
      price: parseFloat(price),
      rating: 5.0,
      styleTags: [category, subcategory],
      description,
      renderConfig: {
        baseColor: colors,
        texture
      }
    };

    setGarments([newGarment, ...garments]);
    alert(`Garment "${name}" uploaded successfully and synchronized with the Smart Mirror catalog!`);
    
    // Reset form
    setName('');
    setPrice('59');
    setDescription('');
    setActiveTab('library');
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to remove this garment from the live catalog?')) {
      setGarments(garments.filter(g => g.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8">
      {/* Top navigation */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-white/10 pb-6">
        <div>
          <button
            onClick={onBackToMirror}
            className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-2 text-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Smart Mirror</span>
          </button>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-400">
            Smart Mirror Management Portal
          </h1>
        </div>

        <div className="flex gap-2">
          {(['analytics', 'library', 'uploader'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                activeTab === tab
                  ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/10'
                  : 'bg-white/5 border border-white/10 hover:bg-white/10 text-neutral-400 hover:text-white'
              }`}
            >
              {tab === 'analytics' && 'Analytics'}
              {tab === 'library' && 'Garment Library'}
              {tab === 'uploader' && 'Upload Garment'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Areas */}
      <div className="max-w-7xl mx-auto">
        
        {/* --- ANALYTICS VIEW --- */}
        {activeTab === 'analytics' && (
          <div className="space-y-8 animate-fade-in">
            {/* HUD Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-neutral-400">
                  <span className="text-xs uppercase tracking-wider font-semibold">Total Virtual Try-ons</span>
                  <Package className="w-4 h-4 text-yellow-500" />
                </div>
                <p className="text-3xl font-extrabold">24,850</p>
                <div className="text-[10px] text-green-500 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>+18.4% this week</span>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-neutral-400">
                  <span className="text-xs uppercase tracking-wider font-semibold">Avg. Mirrors Session</span>
                  <TrendingUp className="w-4 h-4 text-yellow-500" />
                </div>
                <p className="text-3xl font-extrabold">9m 42s</p>
                <span className="text-[10px] text-neutral-400">Stable engagement average</span>
              </div>

              <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-neutral-400">
                  <span className="text-xs uppercase tracking-wider font-semibold">Try-On Conversion</span>
                  <BarChart3 className="w-4 h-4 text-yellow-500" />
                </div>
                <p className="text-3xl font-extrabold">3.82%</p>
                <div className="text-[10px] text-green-500 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>+1.2% over standard ecomm</span>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-neutral-400">
                  <span className="text-xs uppercase tracking-wider font-semibold">Active Customers</span>
                  <Users className="w-4 h-4 text-yellow-500" />
                </div>
                <p className="text-3xl font-extrabold">1,480</p>
                <span className="text-[10px] text-neutral-400">Live active sessions</span>
              </div>
            </div>

            {/* Simulated Charts and Tables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
                <h3 className="text-lg font-bold">Trending Occasions</h3>
                <div className="space-y-3.5">
                  {[
                    { name: 'Streetwear & Festival Wear', count: '8,420 try-ons', percent: '85%' },
                    { name: 'Luxury Formal & Blazers', count: '6,150 try-ons', percent: '68%' },
                    { name: 'Traditional Ethnic (Sarees/Lehengas)', count: '5,820 try-ons', percent: '62%' },
                    { name: 'Casual Daily Lounge Wear', count: '4,460 try-ons', percent: '45%' }
                  ].map((item, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>{item.name}</span>
                        <span className="text-neutral-400">{item.count}</span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-yellow-500 rounded-full"
                          style={{ width: item.percent }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
                <h3 className="text-lg font-bold">Try-On Demographics</h3>
                <div className="space-y-3.5">
                  {[
                    { name: 'Women Fashion (Dresses, Kurtis, Sarees)', count: '48%', color: 'bg-yellow-500' },
                    { name: 'Men Fashion (Oversized Tees, Jeans, Blazers)', count: '45%', color: 'bg-white' },
                    { name: 'Girls & Kids Collections', count: '4%', color: 'bg-neutral-600' },
                    { name: 'Boys Collections', count: '3%', color: 'bg-neutral-800' }
                  ].map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${item.color}`} />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-bold">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- UPLOADER FORM --- */}
        {activeTab === 'uploader' && (
          <form onSubmit={handleUpload} className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl max-w-2xl mx-auto space-y-6 animate-scale-up">
            <div className="flex items-center gap-2 text-yellow-500 mb-2">
              <Upload className="w-5 h-5" />
              <h2 className="text-xl font-bold">Add Garment to Smart Mirror</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <label className="text-xs text-neutral-400 font-semibold uppercase">Garment Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Slim Denim Jacket"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500/50 transition-colors text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-neutral-400 font-semibold uppercase">Garment Type</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as any)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500/50 transition-colors text-white"
                >
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                  <option value="outerwear">Outerwear</option>
                  <option value="full">Full Body (Dress/Saree)</option>
                  <option value="shoes">Shoes</option>
                  <option value="accessory">Accessory</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-neutral-400 font-semibold uppercase">Price ($ USD)</label>
                <input
                  type="number"
                  required
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500/50 transition-colors text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-neutral-400 font-semibold uppercase">Category Theme</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none text-white"
                >
                  <option value="Casual">Casual</option>
                  <option value="Streetwear">Streetwear</option>
                  <option value="Luxury">Luxury</option>
                  <option value="Business">Business</option>
                  <option value="Traditional">Traditional</option>
                  <option value="Vacation">Vacation</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-neutral-400 font-semibold uppercase">Gender Profile</label>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value as any)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none text-white"
                >
                  <option value="man">Man</option>
                  <option value="woman">Woman</option>
                  <option value="boy">Boy</option>
                  <option value="girl">Girl</option>
                  <option value="unisex">Unisex</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-neutral-400 font-semibold uppercase">Primary Color (Hex)</label>
                <input
                  type="color"
                  value={colors}
                  onChange={e => setColors(e.target.value)}
                  className="w-full h-[46px] bg-white/5 border border-white/10 rounded-xl px-2 py-1 text-sm focus:outline-none focus:border-yellow-500/50 cursor-pointer text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-neutral-400 font-semibold uppercase">Fabric Texture</label>
                <select
                  value={texture}
                  onChange={e => setTexture(e.target.value as any)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none text-white"
                >
                  <option value="plain">Plain Cotton</option>
                  <option value="denim">Denim</option>
                  <option value="stripes">Stripes</option>
                  <option value="plaid">Plaid/Flannel</option>
                  <option value="leather">Leather</option>
                  <option value="knitted">Knitted</option>
                </select>
              </div>

              <div className="col-span-2 space-y-1">
                <label className="text-xs text-neutral-400 font-semibold uppercase">Description</label>
                <textarea
                  placeholder="Describe material, drape details..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500/50 transition-colors text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>Add to Mirror Catalog</span>
            </button>
          </form>
        )}

        {/* --- LIBRARY TABLE VIEW --- */}
        {activeTab === 'library' && (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4 animate-fade-in">
            <div className="flex justify-between items-center gap-4 flex-col md:flex-row">
              <span className="text-lg font-bold">Catalogued Garments ({garments.length})</span>
              <div className="relative w-full md:w-80">
                <input
                  type="text"
                  placeholder="Search garments..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none text-white"
                />
                <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-neutral-400 text-xs uppercase tracking-wider font-semibold">
                    <th className="py-4 px-4">Garment</th>
                    <th className="py-4 px-4">Type</th>
                    <th className="py-4 px-4">Category</th>
                    <th className="py-4 px-4">Gender</th>
                    <th className="py-4 px-4">Color</th>
                    <th className="py-4 px-4">Price</th>
                    <th className="py-4 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {garments
                    .filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .slice(0, 30)
                    .map(g => (
                      <tr key={g.id} className="border-b border-white/5 text-sm hover:bg-white/5 transition-colors">
                        <td className="py-4 px-4 font-bold">{g.name}</td>
                        <td className="py-4 px-4 capitalize text-neutral-400">{g.type}</td>
                        <td className="py-4 px-4 text-neutral-400">{g.category}</td>
                        <td className="py-4 px-4 capitalize text-neutral-400">{g.gender}</td>
                        <td className="py-4 px-4">
                          <div 
                            className="w-5 h-5 rounded-full border border-white/20 shadow"
                            style={{ backgroundColor: g.renderConfig.baseColor }}
                          />
                        </td>
                        <td className="py-4 px-4 font-bold text-yellow-500">${g.price}</td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => handleDelete(g.id)}
                            className="p-2 rounded-lg bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white transition-all cursor-pointer"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
