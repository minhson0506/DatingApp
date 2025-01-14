/* eslint-disable camelcase */
import {View, Text, FlatList, StyleSheet} from 'react-native';
import React, {useEffect, useState, useContext, useRef} from 'react';
import {Avatar, ListItem, Image} from 'react-native-elements';
import {uploadsUrl} from '../utils/variables';
import PropTypes from 'prop-types';
import {useUser, useMedia, useFavourite} from '../hooks/ApiHooks';
import {Button} from 'react-native-paper';
import {LinearGradient} from 'expo-linear-gradient';
import UpIcon from '../assets/heart.svg';
import {
  useFonts,
  Poppins_700Bold,
  Poppins_500Medium,
} from '@expo-google-fonts/poppins';
import AppLoading from 'expo-app-loading';
import {MainContext} from '../contexts/MainContext';
import {Menu, MenuItem} from 'react-native-material-menu';

const Like = ({navigation}) => {
  const [fontsLoaded] = useFonts({
    Poppins_700Bold,
    Poppins_500Medium,
  });

  // menu state & functions
  const [visible, setVisible] = useState(false);
  const hideMenu = () => setVisible(false);
  const showMenu = () => setVisible(true);

  const listRef = useRef(null);

  const {loading, token} = useContext(MainContext);

  const {getUserById} = useUser();
  const {getMediaByUserId, getAllMediaByCurrentUserId} = useMedia();
  const {getFavouritesByFileId} = useFavourite();

  const [hook, setHook] = useState([]);
  const [seconds, setSeconds] = useState(0);

  const fetchNewLikes = async () => {
    try {
      // get all media of login user
      const userFiles = await getAllMediaByCurrentUserId(token);
      const userFilesId = [];
      for (const file of userFiles) {
        userFilesId.push(file.file_id);
      }

      // get likes from every file
      let likeData = [];
      const seen = new Set();
      for (const id of userFilesId) {
        const likeScraping = await getFavouritesByFileId(id);
        likeData = likeData.concat(likeScraping);
      }

      // sort the data in order by favouriteId, most recent -> least recent
      likeData.sort((a, b) => (a.favourite_id > b.favourite_id ? -1 : 1));

      // filter duplicate
      likeData = likeData.filter((el) => {
        const duplicate = seen.has(el.user_id);
        seen.add(el.user_id);
        return !duplicate;
      });
      likeData = likeData.slice(0, 10);

      // map file id to user id
      const likedUserId = likeData.map((id) => id.user_id);

      // fetch data (avatar and user data) of hooks
      let newHooksData = [];
      for (const id of likedUserId) {
        let avatarScraping = await getMediaByUserId(id);
        const userScraping = await getUserById(id, token);
        avatarScraping = avatarScraping.filter(
          (obj) => obj.title.toLowerCase() === 'avatar'
        );
        const totalData = {
          ...userScraping,
          ...avatarScraping,
        };
        newHooksData = newHooksData.concat(totalData);
      }
      setHook(newHooksData);
    } catch (error) {
      console.error('Fetch new hooks error', error);
      setHook({username: 'unknown'});
    }
  };

  useEffect(() => {
    fetchNewLikes();
  }, [loading]);

  // force reload every 1s to update like constantly
  useEffect(() => {
    const interval = setInterval(() => {
      if (seconds === 100) {
        setSeconds(0);
      } else {
        setSeconds(seconds + 1);
      }
      fetchNewLikes();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!fontsLoaded) {
    return <AppLoading />;
  } else {
    return (
      <View style={{flex: 1, backgroundColor: 'white'}}>
        <LinearGradient
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={styles.header}
          colors={['#FF707B', '#FF934E']}
        >
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <Menu
              style={styles.menuBox}
              visible={visible}
              anchor={
                <Image
                  source={require('../assets/menu2.png')}
                  style={styles.menu}
                  onPress={() => {
                    showMenu();
                  }}
                />
              }
              onRequestClose={hideMenu}
            >
              <MenuItem
                pressColor={'#FDC592'}
                textStyle={styles.textMenu}
                onPress={() => {
                  hideMenu();
                  navigation.navigate('Modify user');
                }}
              >
                Account
              </MenuItem>
              <MenuItem
                pressColor={'#FDC592'}
                textStyle={styles.textMenu}
                onPress={() => {
                  hideMenu();
                  navigation.navigate('Instructions');
                }}
              >
                How Hook works
              </MenuItem>
            </Menu>

            <Text style={styles.appName}>hook</Text>
            <Button style={{width: 0, margin: 0}} disabled={true}></Button>
          </View>
          <View style={styles.button}>
            <UpIcon height={25} style={{alignSelf: 'center'}}></UpIcon>
          </View>
          <Text style={styles.title}>
            See who’s already liked you. Don’t miss a hook!
          </Text>
        </LinearGradient>
        <FlatList
          ref={listRef}
          ListFooterComponent={
            hook.length >= 4 ? (
              <Button
                onPress={() => {
                  listRef.current.scrollToOffset({offset: 0, animated: true});
                }}
                style={{
                  width: '95%',
                  alignSelf: 'center',
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: '#82008F',
                  borderRadius: 5,
                }}
              >
                Back to top
              </Button>
            ) : (
              <></>
            )
          }
          columnWrapperStyle={{flex: 1, justifyContent: 'space-around'}}
          numColumns={2}
          showsHorizontalScrollIndicator={false}
          horizontal={false}
          data={hook}
          keyExtractor={(item) => item.user_id.toString()}
          renderItem={({item}) => (
            <ListItem
              onPress={() => {
                navigation.navigate('Single', {file: item[0]});
              }}
            >
              {item[0] ? (
                <View
                  style={{
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <Avatar
                    style={styles.avatar}
                    avatarStyle={{
                      borderRadius: 10,
                    }}
                    source={{uri: uploadsUrl + item[0].filename}}
                  />
                  <Text style={styles.username}>
                    {item.username}, {JSON.parse(item.full_name).location}
                  </Text>
                </View>
              ) : (
                <></>
              )}
            </ListItem>
          )}
        ></FlatList>
      </View>
    );
  }
};
const styles = StyleSheet.create({
  header: {
    height: 220,
    paddingTop: 40,
  },
  menu: {
    tintColor: 'white',
    marginLeft: 20,
    marginTop: 15,
    marginBottom: 20,
    height: 25,
    width: 25,
  },
  menuBox: {
    marginTop: 45,
    marginLeft: 10,
    borderRadius: 5,
  },
  textMenu: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 16,
  },
  appName: {
    fontSize: 40,
    fontFamily: 'Poppins_700Bold',
    color: 'white',
    letterSpacing: 5,
    marginLeft: '5%',
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 100,
    backgroundColor: 'white',
    alignSelf: 'center',
    justifyContent: 'center',
  },
  title: {
    width: '70%',
    color: 'white',
    fontSize: 18,
    fontFamily: 'Poppins_500Medium',
    textAlign: 'center',
    alignSelf: 'center',
    marginTop: 10,
  },
  avatar: {
    height: 220,
    width: 170,
  },
  username: {
    fontSize: 17,
    fontFamily: 'Poppins_500Medium',
  },
});

Like.propTypes = {
  navigation: PropTypes.object,
};

export default Like;
