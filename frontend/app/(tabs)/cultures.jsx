// app/(tabs)/cultures.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Alert, TextInput,
  Modal, FlatList, ActivityIndicator, ScrollView,
  Platform, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import BottomBar from '../../components/BottomBar';
import { BrandHeader } from '../../components/BrandHeader';
import { API_ENDPOINTS, apiFetch } from '../../config/api';
import { useLanguage } from '../../context/LanguageContext';

// ─── Données FAO-56 (nom → variété par défaut) ────────────────────────────────
const KC_CULTURES = [
  { nom: 'Orange',         variete: 'Navel Washington'     },
  { nom: 'Citron',         variete: 'Eureka / Lisbon'      },
  { nom: 'Mandarine',      variete: 'Clémentine'           },
  { nom: 'Pamplemousse',   variete: 'Standard'             },
  { nom: 'Olivier',        variete: 'Chemlali / Chetoui'   },
  { nom: 'Grenadier',      variete: 'Standard'             },
  { nom: 'Figuier',        variete: 'Standard'             },
  { nom: 'Pommier',        variete: 'Golden / Red'         },
  { nom: 'Poirier',        variete: 'Williams / Conference'},
  { nom: 'Pêcher',         variete: 'Standard'             },
  { nom: 'Abricotier',     variete: 'Standard'             },
  { nom: 'Vigne',          variete: 'Table / Vin'          },
  { nom: 'Dattier',        variete: 'Deglet Nour'          },
  { nom: 'Tomate',         variete: 'Cœur de bœuf / Ronde'},
  { nom: 'Pomme de terre', variete: 'Standard'             },
  { nom: 'Poivron',        variete: 'Standard'             },
  { nom: 'Oignon',         variete: 'Standard'             },
  { nom: 'Concombre',      variete: 'Standard'             },
  { nom: 'Courgette',      variete: 'Standard'             },
  { nom: 'Laitue',         variete: 'Standard'             },
  { nom: 'Haricot',        variete: 'Standard'             },
  { nom: 'Melon',          variete: 'Standard'             },
  { nom: 'Artichaut',      variete: 'Standard'             },
  { nom: 'Blé',            variete: 'Dur / Tendre'         },
  { nom: 'Orge',           variete: 'Standard'             },
  { nom: 'Maïs',           variete: 'Standard'             },
  { nom: 'Tournesol',      variete: 'Standard'             },
];

// ─── Composant AutocompleteInput ──────────────────────────────────────────────
function AutocompleteInput({ label, required, value, onChangeText, placeholder, suggestions, onSelectSuggestion, zIndex = 10 }) {
  const [showList, setShowList] = useState(false);
  const filtered = suggestions.filter(s =>
    s.toLowerCase().includes((value || '').toLowerCase())
  );
  const showSuggestions = showList && filtered.length > 0;

  return (
    <View style={[ac.wrap, { zIndex }]}>
      <Text style={ac.label}>
        {label} {required && <Text style={{ color: '#ef4444' }}>*</Text>}
      </Text>
      {/* Input + chevron */}
      <View style={ac.inputRow}>
        <TextInput
          style={ac.input}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          value={value}
          onChangeText={v => { onChangeText(v); setShowList(true); }}
          onFocus={() => setShowList(true)}
          onBlur={() => setTimeout(() => setShowList(false), 180)}
        />
        <TouchableOpacity
          style={ac.chevron}
          onPress={() => setShowList(v => !v)}
          activeOpacity={0.7}
        >
          <Ionicons name={showList ? 'chevron-up' : 'chevron-down'} size={18} color="#6b7280" />
        </TouchableOpacity>
      </View>
      {/* Dropdown list */}
      {showSuggestions && (
        <View style={ac.dropdown}>
          <ScrollView keyboardShouldPersistTaps="always" style={{ maxHeight: 200 }}>
            {filtered.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[ac.item, item === value && ac.itemActive]}
                onPress={() => { onSelectSuggestion(item); setShowList(false); }}
                activeOpacity={0.8}
              >
                <Text style={[ac.itemText, item === value && ac.itemTextActive]}>
                  {item}
                </Text>
                {item === value && <Ionicons name="checkmark" size={16} color="#16a34a" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const ac = StyleSheet.create({
  wrap:          { marginBottom: 16, position: 'relative' },
  label:         { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  inputRow:      { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, backgroundColor: '#f9fafb', height: 48 },
  input:         { flex: 1, fontSize: 14, color: '#111827', paddingHorizontal: 12, outlineStyle: 'none', outlineWidth: 0 },
  chevron:       { paddingHorizontal: 12 },
  dropdown:      { position: 'absolute', top: 78, left: 0, right: 0, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 10, zIndex: 999 },
  item:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  itemActive:    { backgroundColor: '#f0fdf4' },
  itemText:      { fontSize: 14, color: '#374151' },
  itemTextActive:{ color: '#16a34a', fontWeight: '700' },
});

// ─── Page principale ──────────────────────────────────────────────────────────
export default function CulturesPage() {
  const { t } = useLanguage();
  const [cultures,       setCultures]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [modalVisible,   setModalVisible]   = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error,          setError]          = useState(null);
  const [deletingId,     setDeletingId]     = useState(null);

  const [newCulture, setNewCulture] = useState({
    parcelle: '', nom: '', variete: '',
    datePlantation: null, surface: '', nombreArbres: '',
  });

  useEffect(() => { loadCultures(); }, []);

  const loadCultures = async () => {
    try {
      setLoading(true); setError(null);
      const response = await apiFetch(API_ENDPOINTS.cultures.base);
      if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
      const result = await response.json();
      setCultures(result?.success ? result.data : []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  };

  // ── Quand nom est sélectionné → auto-remplir variété ──────────────────────
  const handleNomSelect = (nom) => {
    const found = KC_CULTURES.find(c => c.nom.toLowerCase() === nom.toLowerCase());
    setNewCulture(prev => ({
      ...prev,
      nom,
      variete: found ? found.variete : prev.variete,
    }));
  };

  const addCulture = async () => {
    if (!newCulture.parcelle || !newCulture.nom || !newCulture.variete || !newCulture.datePlantation || !newCulture.surface) {
      Alert.alert(t('common.error'), t('cultures.errors.fillAll')); return;
    }
    const surfaceValue = parseFloat(newCulture.surface);
    if (isNaN(surfaceValue) || surfaceValue <= 0) {
      Alert.alert(t('common.error'), t('cultures.errors.invalidSurface')); return;
    }
    let nombreArbresValue = null;
    if (newCulture.nombreArbres?.trim()) {
      nombreArbresValue = parseInt(newCulture.nombreArbres);
      if (isNaN(nombreArbresValue) || nombreArbresValue <= 0) {
        Alert.alert(t('common.error'), "Le nombre d'arbres doit être un nombre positif"); return;
      }
    }
    try {
      setLoading(true);
      const response = await apiFetch(API_ENDPOINTS.cultures.base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parcelle:       newCulture.parcelle,
          nom:            newCulture.nom,
          variete:        newCulture.variete,
          datePlantation: newCulture.datePlantation.toISOString(),
          surface:        surfaceValue,
          nombreArbres:   nombreArbresValue,
        }),
      });
      const result = await response.json();
      if (result.success) {
        Alert.alert(t('common.success'), t('cultures.errors.addSuccess'));
        setModalVisible(false);
        resetForm();
        loadCultures();
      } else { Alert.alert(t('common.error'), result.error); }
    } catch { Alert.alert(t('common.error'), t('cultures.errors.addError')); }
    finally { setLoading(false); }
  };

  const deleteCulture = async (id) => {
    try {
      setDeletingId(id);
      const response = await apiFetch(API_ENDPOINTS.cultures.byId(id), { method: 'DELETE' });
      const result = await response.json();
      if (result.success) loadCultures();
      else Alert.alert(t('common.error'), result.error);
    } catch { Alert.alert(t('common.error'), t('common.error')); }
    finally { setDeletingId(null); }
  };

  const resetForm = () => setNewCulture({ parcelle:'', nom:'', variete:'', datePlantation:null, surface:'', nombreArbres:'' });

  const nomSuggestions     = KC_CULTURES.map(c => c.nom);
  const varieteSuggestions = KC_CULTURES.map(c => c.variete).filter((v,i,a) => v !== 'Standard' || a.indexOf(v) === i);
  const allVarietes        = [...new Set(KC_CULTURES.map(c => c.variete))];

  if (loading && cultures.length === 0) return (
    <SafeAreaView style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
      <ActivityIndicator size="large" color="#4CAF50" />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:'#f3f4f6' }}>

      {/* ── Header avec drawer ── */}
      <BrandHeader
        title={t('cultures.title')}
        right={
          <TouchableOpacity style={s.addBtn} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.addBtnText}>{t('cultures.add')}</Text>
          </TouchableOpacity>
        }
      />

      {/* ── Liste ── */}
      <FlatList
        data={cultures}
        keyExtractor={item => item._id}
        contentContainerStyle={{ padding:12, paddingBottom:90 }}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <Ionicons name="leaf-outline" size={52} color="#d1d5db" />
            <Text style={s.emptyText}>Aucune culture ajoutée</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={{ flex:1 }}>
              <Text style={s.cardNom}>{item.nom}</Text>
              <Text style={s.cardRow}>📍 {t('cultures.details.parcel')}: <Text style={s.cardVal}>{item.parcelle}</Text></Text>
              <Text style={s.cardRow}>🌿 {t('cultures.details.variety')}: <Text style={s.cardVal}>{item.variete}</Text></Text>
              <Text style={s.cardRow}>📅 {t('cultures.details.planted')}: <Text style={s.cardVal}>{formatDate(item.datePlantation)}</Text></Text>
              <Text style={s.cardRow}>📐 {t('cultures.details.surface')}: <Text style={s.cardVal}>{item.surface} m²</Text></Text>
              {item.nombreArbres && <Text style={s.cardRow}>🌳 Arbres: <Text style={s.cardVal}>{item.nombreArbres}</Text></Text>}
              {item.kcActuel && (
                <View style={s.kcBadge}>
                  <Text style={s.kcBadgeText}>Kc {item.kcActuel?.toFixed(2)} · {item.stadeActuel}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={[s.deleteBtn, deletingId === item._id && { opacity:0.4 }]}
              onPress={() => deleteCulture(item._id)}
              disabled={deletingId === item._id}
            >
              {deletingId === item._id
                ? <ActivityIndicator size="small" color="#ef4444" />
                : <Ionicons name="trash-outline" size={22} color="#ef4444" />
              }
            </TouchableOpacity>
          </View>
        )}
      />

      {/* ── Modal ajout ── */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => { setModalVisible(false); resetForm(); }}>
        <View style={s.overlay}>
          <View style={s.sheet}>

            {/* Header modal */}
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{t('cultures.addCrop')}</Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding:20 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

              {/* Parcelle */}
              <View style={{ marginBottom:16 }}>
                <Text style={s.fieldLabel}>{t('cultures.field.parcel')} <Text style={{ color:'#ef4444' }}>*</Text></Text>
                <TextInput
                  style={s.fieldInput}
                  placeholder={t('cultures.field.placeholder.parcel')}
                  placeholderTextColor="#9ca3af"
                  value={newCulture.parcelle}
                  onChangeText={v => setNewCulture({...newCulture, parcelle:v})}
                />
              </View>

              {/* Nom — autocomplete avec dropdown */}
              <AutocompleteInput
                label={t('cultures.field.name')}
                required
                value={newCulture.nom}
                onChangeText={v => setNewCulture({...newCulture, nom:v})}
                onSelectSuggestion={handleNomSelect}
                placeholder={t('cultures.field.placeholder.name')}
                suggestions={nomSuggestions}
                zIndex={30}
              />

              {/* Variété — autocomplete avec dropdown */}
              <AutocompleteInput
                label={t('cultures.field.variety')}
                required
                value={newCulture.variete}
                onChangeText={v => setNewCulture({...newCulture, variete:v})}
                onSelectSuggestion={v => setNewCulture({...newCulture, variete:v})}
                placeholder={t('cultures.field.placeholder.variety')}
                suggestions={allVarietes}
                zIndex={20}
              />

              {/* Date */}
              <View style={{ marginBottom:16 }}>
                <Text style={s.fieldLabel}>{t('cultures.field.plantingDate')} <Text style={{ color:'#ef4444' }}>*</Text></Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="date"
                    value={newCulture.datePlantation ? newCulture.datePlantation.toISOString().split('T')[0] : ''}
                    onChange={e => setNewCulture({...newCulture, datePlantation: new Date(e.target.value)})}
                    style={{ width:'100%', border:'1px solid #d1d5db', borderRadius:10, padding:'12px', fontSize:14, backgroundColor:'#f9fafb', fontFamily:'inherit', boxSizing:'border-box' }}
                  />
                ) : (
                  <>
                    <TouchableOpacity style={s.fieldInput} onPress={() => setShowDatePicker(true)}>
                      <Text style={{ fontSize:14, color: newCulture.datePlantation ? '#111827' : '#9ca3af' }}>
                        {newCulture.datePlantation ? formatDate(newCulture.datePlantation) : 'Sélectionner une date'}
                      </Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DateTimePicker
                        value={newCulture.datePlantation || new Date()}
                        mode="date"
                        onChange={(event, date) => { setShowDatePicker(false); if (date) setNewCulture({...newCulture, datePlantation:date}); }}
                      />
                    )}
                  </>
                )}
              </View>

              {/* Surface */}
              <View style={{ marginBottom:16 }}>
                <Text style={s.fieldLabel}>{t('cultures.field.surface')} <Text style={{ color:'#ef4444' }}>*</Text></Text>
                <TextInput
                  style={s.fieldInput}
                  placeholder={t('cultures.field.placeholder.surface')}
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  value={newCulture.surface}
                  onChangeText={v => setNewCulture({...newCulture, surface:v})}
                />
              </View>

              {/* Nombre d'arbres */}
              <View style={{ marginBottom:24 }}>
                <Text style={s.fieldLabel}>Nombre d'arbres <Text style={{ color:'#6b7280', fontWeight:'400', fontSize:12 }}>(optionnel)</Text></Text>
                <TextInput
                  style={s.fieldInput}
                  placeholder="Ex: 50"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  value={newCulture.nombreArbres}
                  onChangeText={v => setNewCulture({...newCulture, nombreArbres:v})}
                />
                <Text style={{ fontSize:11, color:'#9ca3af', marginTop:4 }}>Utilisé pour calculer le volume d'eau par arbre</Text>
              </View>

              {/* Boutons */}
              <View style={{ flexDirection:'row', gap:12, marginBottom:16 }}>
                <TouchableOpacity
                  style={[s.btnBase, s.btnCancel]}
                  onPress={() => { setModalVisible(false); resetForm(); }}
                >
                  <Text style={s.btnCancelText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.btnBase, s.btnAdd]} onPress={addCulture}>
                  <Text style={s.btnAddText}>{t('common.add')}</Text>
                </TouchableOpacity>
              </View>

            </ScrollView>
          </View>
        </View>
      </Modal>

      <BottomBar />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:         { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:20, paddingVertical:14, backgroundColor:'#fff', borderBottomWidth:1, borderBottomColor:'#e5e7eb' },
  headerTitle:    { fontSize:20, fontWeight:'700', color:'#111827' },
  addBtn:         { flexDirection:'row', alignItems:'center', gap:4, backgroundColor:'#15803d', paddingHorizontal:14, paddingVertical:8, borderRadius:10 },
  addBtnText:     { color:'#fff', fontWeight:'700', fontSize:14 },
  card:           { flexDirection:'row', alignItems:'flex-start', backgroundColor:'#fff', borderRadius:14, padding:16, marginBottom:10, shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.06, shadowRadius:4, elevation:2 },
  cardNom:        { fontSize:17, fontWeight:'700', color:'#15803d', marginBottom:6 },
  cardRow:        { fontSize:13, color:'#6b7280', marginBottom:2 },
  cardVal:        { fontWeight:'600', color:'#374151' },
  kcBadge:        { marginTop:6, backgroundColor:'#f0fdf4', paddingHorizontal:10, paddingVertical:4, borderRadius:20, alignSelf:'flex-start' },
  kcBadgeText:    { fontSize:11, color:'#16a34a', fontWeight:'700' },
  deleteBtn:      { padding:6, marginLeft:8 },
  emptyWrap:      { alignItems:'center', paddingVertical:60, gap:12 },
  emptyText:      { fontSize:15, color:'#9ca3af' },
  overlay:        { flex:1, backgroundColor:'rgba(0,0,0,0.45)', justifyContent:'flex-end' },
  sheet:          { backgroundColor:'#fff', borderTopLeftRadius:24, borderTopRightRadius:24, maxHeight:'92%' },
  modalHeader:    { flexDirection:'row', justifyContent:'space-between', alignItems:'center', backgroundColor:'#15803d', paddingHorizontal:20, paddingVertical:16, borderTopLeftRadius:24, borderTopRightRadius:24 },
  modalTitle:     { fontSize:18, fontWeight:'700', color:'#fff' },
  fieldLabel:     { fontSize:14, fontWeight:'600', color:'#374151', marginBottom:6 },
  fieldInput:     { borderWidth:1, borderColor:'#d1d5db', borderRadius:10, paddingHorizontal:14, paddingVertical:12, fontSize:14, color:'#111827', backgroundColor:'#f9fafb' },
  btnBase:        { flex:1, paddingVertical:14, borderRadius:12, alignItems:'center' },
  btnCancel:      { backgroundColor:'#f3f4f6', borderWidth:1, borderColor:'#e5e7eb' },
  btnCancelText:  { fontSize:14, fontWeight:'700', color:'#374151' },
  btnAdd:         { backgroundColor:'#15803d' },
  btnAddText:     { fontSize:14, fontWeight:'700', color:'#fff' },
});