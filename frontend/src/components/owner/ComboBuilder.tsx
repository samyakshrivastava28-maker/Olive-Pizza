import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { Sparkles, Image as ImageIcon, CheckCircle, Trash2, Edit2, Play, Calendar, Eye } from 'lucide-react';
import { uploadMediaToCloudinary } from '../../lib/cloudinary';
import { useAuthStore } from '../../lib/store';
import toast from 'react-hot-toast';

export default function ComboBuilder() {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<any[]>([]);
  const [combos, setCombos] = useState<any[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);
  const [loading, setLoading] = useState(true);

  // Combo Draft State
  const [comboName, setComboName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [pricingMode, setPricingMode] = useState<'fixed' | 'offer'>('fixed');
  const [basePrice, setBasePrice] = useState(0);
  const [offerPrice, setOfferPrice] = useState(0);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [cloudinaryPublicId, setCloudinaryPublicId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingComboId, setEditingComboId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch Products
    const qProd = query(collection(db, "products"));
    const unsubProd = onSnapshot(qProd, (snap) => {
      setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch Combos
    const qCombo = query(collection(db, "combos"), orderBy("createdAt", "desc"));
    const unsubCombo = onSnapshot(qCombo, (snap) => {
      setCombos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => {
      unsubProd();
      unsubCombo();
    };
  }, []);

  const selectedProductsData = products.filter(p => selectedProductIds.includes(p.id));

  const handleGenerateImage = async () => {
    if (selectedProductIds.length === 0) {
      toast.error("Select products first!");
      return;
    }
    setIsGenerating(true);
    try {
      const productNames = selectedProductsData.map(p => p.productName).join(' and ');
      const prompt = `A highly professional, realistic 4k advertisement food photography of a combo meal containing ${productNames}. Natural lighting, premium restaurant look.`;
      
      const res = await fetch("/api/ai/generate-product-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: `${comboName || 'Combo Meal'}`,
          customPrompt: prompt,
          modelName: "qwen-image"
        })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        setGeneratedImageUrl(data.imageUrl);
        setCloudinaryPublicId(data.publicId);
        toast.success("Image Generated & Saved to Cloudinary!");
      } else {
        toast.error("Generation failed: " + data.error);
      }
    } catch (e: any) {
      toast.error("Error: " + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const discountPercent = offerPrice > 0 && basePrice > offerPrice 
    ? Math.round(((basePrice - offerPrice) / basePrice) * 100) 
    : 0;

  const handleSaveCombo = async () => {
    if (!comboName || selectedProductIds.length === 0 || !generatedImageUrl) {
      toast.error("Please fill all required fields and generate an image.");
      return;
    }

    const payload = {
      name: comboName,
      description,
      productIds: selectedProductIds,
      pricingMode,
      basePrice,
      offerPrice: pricingMode === 'offer' ? offerPrice : 0,
      discountPercentage: pricingMode === 'offer' ? discountPercent : 0,
      imageUrl: generatedImageUrl,
      cloudinaryPublicId,
      isActive: true,
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingComboId) {
        await updateDoc(doc(db, "combos", editingComboId), payload);
        toast.success("Combo updated successfully!");
      } else {
        await addDoc(collection(db, "combos"), {
          ...payload,
          createdAt: new Date().toISOString()
        });
        toast.success("Combo created successfully!");
      }
      resetForm();
    } catch (e: any) {
      toast.error("Failed to save combo: " + e.message);
    }
  };

  const resetForm = () => {
    setComboName("");
    setDescription("");
    setSelectedProductIds([]);
    setPricingMode('fixed');
    setBasePrice(0);
    setOfferPrice(0);
    setGeneratedImageUrl(null);
    setCloudinaryPublicId(null);
    setIsBuilding(false);
    setEditingComboId(null);
  };

  const editCombo = (combo: any) => {
    setComboName(combo.name);
    setDescription(combo.description);
    setSelectedProductIds(combo.productIds);
    setPricingMode(combo.pricingMode || 'fixed');
    setBasePrice(combo.basePrice);
    setOfferPrice(combo.offerPrice || 0);
    setGeneratedImageUrl(combo.imageUrl);
    setCloudinaryPublicId(combo.cloudinaryPublicId);
    setEditingComboId(combo.id);
    setIsBuilding(true);
  };

  const deleteCombo = async (id: string) => {
    if(confirm("Are you sure you want to delete this combo?")) {
      await deleteDoc(doc(db, "combos", id));
      toast.success("Combo deleted");
    }
  };

  if (loading) return <div>Loading Combos...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Combos 🚀</h2>
        {!isBuilding && (
          <button 
            onClick={() => setIsBuilding(true)}
            className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-lg font-bold"
          >
            + Create New Combo
          </button>
        )}
      </div>

      {isBuilding ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1 */}
            <div className="bg-slate-800 p-6 rounded-xl border border-white/10">
              <h3 className="text-lg font-bold text-primary-400 mb-4">Step 1: Combo Details</h3>
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Combo Name (e.g., Friday Frenzy)" 
                  value={comboName}
                  onChange={(e) => setComboName(e.target.value)}
                  className="w-full p-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-primary-500"
                />
                <textarea 
                  placeholder="Description..." 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-lg bg-slate-900 border border-slate-700 h-24 text-white focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-800 p-6 rounded-xl border border-white/10">
              <h3 className="text-lg font-bold text-primary-400 mb-4">Step 2: Select Products</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                {products.map(p => {
                  const isSelected = selectedProductIds.includes(p.id);
                  return (
                    <div 
                      key={p.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedProductIds(prev => prev.filter(id => id !== p.id));
                        } else {
                          setSelectedProductIds(prev => [...prev, p.id]);
                        }
                      }}
                      className={`cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center text-center transition-all ${isSelected ? 'border-primary-500 bg-primary-500/10' : 'border-slate-700 bg-slate-900 hover:border-slate-500'}`}
                    >
                      <img src={p.imageUrl} alt={p.productName} className="w-16 h-16 object-cover rounded-full mb-2" />
                      <p className="text-sm font-bold text-slate-200 truncate w-full">{p.productName}</p>
                      {isSelected && <CheckCircle className="w-5 h-5 text-primary-500 absolute top-2 right-2" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-800 p-6 rounded-xl border border-white/10">
              <h3 className="text-lg font-bold text-primary-400 mb-4">Step 3: Pricing Mode</h3>
              <div className="flex gap-4 mb-4">
                <button 
                  onClick={() => setPricingMode('fixed')}
                  className={`flex-1 py-2 rounded-lg font-bold ${pricingMode === 'fixed' ? 'bg-primary-500 text-white' : 'bg-slate-900 text-slate-400 border border-slate-700'}`}
                >
                  Fixed Price
                </button>
                <button 
                  onClick={() => setPricingMode('offer')}
                  className={`flex-1 py-2 rounded-lg font-bold ${pricingMode === 'offer' ? 'bg-primary-500 text-white' : 'bg-slate-900 text-slate-400 border border-slate-700'}`}
                >
                  Offer Price
                </button>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs text-slate-400 mb-1 block">{pricingMode === 'fixed' ? 'Final Price (₹)' : 'Original Price (₹)'}</label>
                  <input 
                    type="number" 
                    value={basePrice || ''}
                    onChange={(e) => setBasePrice(Number(e.target.value))}
                    className="w-full p-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
                {pricingMode === 'offer' && (
                  <div className="flex-1">
                    <label className="text-xs text-primary-400 mb-1 block font-bold">Offer Price (₹)</label>
                    <input 
                      type="number" 
                      value={offerPrice || ''}
                      onChange={(e) => setOfferPrice(Number(e.target.value))}
                      className="w-full p-3 rounded-lg bg-slate-900 border border-primary-500/50 focus:border-primary-500 text-primary-100 font-bold focus:outline-none"
                    />
                  </div>
                )}
              </div>
              
              {pricingMode === 'offer' && discountPercent > 0 && (
                <div className="mt-4 bg-green-500/20 text-green-400 p-3 rounded-lg font-bold text-center border border-green-500/30">
                  Customers Save {discountPercent}%!
                </div>
              )}
            </div>

            {/* Step 4 */}
            <div className="bg-slate-800 p-6 rounded-xl border border-white/10">
              <h3 className="text-lg font-bold text-primary-400 mb-4">Step 4: AI Image Generation</h3>
              <button 
                onClick={handleGenerateImage}
                disabled={isGenerating || selectedProductIds.length === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isGenerating ? <span className="animate-pulse">Generating...</span> : <><Sparkles className="w-5 h-5"/> Generate Promotional Image</>}
              </button>
            </div>
            
            <div className="flex gap-4">
              <button onClick={resetForm} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold">Cancel</button>
              <button onClick={handleSaveCombo} className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold">Save Combo</button>
            </div>
          </div>

          {/* Live Preview Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-slate-800 p-6 rounded-xl border border-white/10 shadow-2xl">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                <Eye className="w-4 h-4"/> Live Preview
              </h3>

              <div className="bg-[#0B0F14] rounded-2xl overflow-hidden border border-white/5 relative group">
                {pricingMode === 'offer' && discountPercent > 0 && (
                  <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-black px-2 py-1 rounded-md z-10 shadow-lg">
                    {discountPercent}% OFF
                  </div>
                )}
                
                <div className="relative h-48 bg-slate-900 flex items-center justify-center overflow-hidden">
                  {generatedImageUrl ? (
                    <img src={generatedImageUrl} alt="Combo" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <ImageIcon className="w-12 h-12 text-slate-700" />
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-black text-white text-lg mb-1">{comboName || 'Awesome Combo'}</h3>
                  <p className="text-sm text-slate-400 line-clamp-2 mb-4">{description || 'Delicious combo description.'}</p>
                  
                  <div className="flex -space-x-2 mb-4">
                    {selectedProductsData.slice(0,4).map(p => (
                      <img key={p.id} src={p.imageUrl} className="w-8 h-8 rounded-full border-2 border-[#0B0F14]" title={p.productName} />
                    ))}
                    {selectedProductsData.length > 4 && (
                      <div className="w-8 h-8 rounded-full border-2 border-[#0B0F14] bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                        +{selectedProductsData.length - 4}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-auto">
                    <div>
                      {pricingMode === 'offer' ? (
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-500 line-through font-medium">₹{basePrice || '0'}</span>
                          <span className="text-xl font-black text-primary-500 drop-shadow-[0_2px_10px_rgba(249,115,22,0.3)]">₹{offerPrice || '0'}</span>
                        </div>
                      ) : (
                        <span className="text-xl font-black text-white">₹{basePrice || '0'}</span>
                      )}
                    </div>
                    <button className="bg-white/10 hover:bg-primary-500 text-white font-bold py-2 px-4 rounded-xl transition-all">
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {combos.map(combo => (
            <div key={combo.id} className="bg-slate-800 rounded-xl border border-white/10 overflow-hidden group">
              <div className="h-40 relative overflow-hidden">
                {combo.pricingMode === 'offer' && combo.discountPercentage > 0 && (
                  <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-black px-2 py-1 rounded shadow-lg z-10">
                    {combo.discountPercentage}% OFF
                  </div>
                )}
                <img src={combo.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button onClick={() => editCombo(combo)} className="p-1.5 bg-slate-900/80 hover:bg-primary-500 text-white rounded-md backdrop-blur-sm transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteCombo(combo.id)} className="p-1.5 bg-slate-900/80 hover:bg-red-500 text-white rounded-md backdrop-blur-sm transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <h4 className="font-bold text-white mb-2 truncate">{combo.name}</h4>
                <div className="flex justify-between items-center mt-4">
                   {combo.pricingMode === 'offer' ? (
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-500 line-through">₹{combo.basePrice}</span>
                        <span className="text-lg font-black text-primary-500">₹{combo.offerPrice}</span>
                      </div>
                    ) : (
                      <span className="text-lg font-black text-white">₹{combo.basePrice}</span>
                    )}
                    <span className="text-xs font-bold text-slate-400 bg-slate-900 px-2 py-1 rounded-md">{combo.productIds.length} Items</span>
                </div>
              </div>
            </div>
          ))}
          {combos.length === 0 && (
             <div className="col-span-full py-12 text-center text-slate-500 font-medium bg-slate-800/50 rounded-xl border border-dashed border-slate-700">
               No combos found. Create your first combo to boost sales!
             </div>
          )}
        </div>
      )}
    </div>
  );
}
